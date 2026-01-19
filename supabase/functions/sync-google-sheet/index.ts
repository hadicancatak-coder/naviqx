import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ColumnMapping {
  name: string;
  landing_page?: string;
  campaign_type?: string;
  description?: string;
}

interface SheetData {
  values: string[][];
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get auth token from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { syncConfigId, accessToken } = await req.json();

    if (!syncConfigId || !accessToken) {
      return new Response(
        JSON.stringify({ error: 'Missing syncConfigId or accessToken' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Starting sync for config: ${syncConfigId}`);

    // Get sync config
    const { data: syncConfig, error: configError } = await supabase
      .from('google_sheets_campaign_sync')
      .select('*')
      .eq('id', syncConfigId)
      .eq('user_id', user.id)
      .single();

    if (configError || !syncConfig) {
      console.error('Config error:', configError);
      return new Response(
        JSON.stringify({ error: 'Sync configuration not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update status to syncing
    await supabase
      .from('google_sheets_campaign_sync')
      .update({ sync_status: 'syncing', sync_error: null })
      .eq('id', syncConfigId);

    // Fetch data from Google Sheets
    const sheetId = syncConfig.sheet_id;
    const tabName = syncConfig.tab_name || 'Sheet1';
    const sheetsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(tabName)}`;

    console.log(`Fetching from Google Sheets: ${sheetsUrl}`);

    const sheetsResponse = await fetch(sheetsUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!sheetsResponse.ok) {
      const errorText = await sheetsResponse.text();
      console.error('Google Sheets API error:', errorText);
      
      await supabase
        .from('google_sheets_campaign_sync')
        .update({ 
          sync_status: 'error', 
          sync_error: `Google Sheets API error: ${sheetsResponse.status}` 
        })
        .eq('id', syncConfigId);

      return new Response(
        JSON.stringify({ error: 'Failed to fetch Google Sheets data', details: errorText }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sheetData: SheetData = await sheetsResponse.json();
    const rows = sheetData.values || [];

    if (rows.length < 2) {
      await supabase
        .from('google_sheets_campaign_sync')
        .update({ 
          sync_status: 'success', 
          last_synced_at: new Date().toISOString(),
          sync_count: (syncConfig.sync_count || 0) + 1
        })
        .eq('id', syncConfigId);

      return new Response(
        JSON.stringify({ success: true, synced: 0, message: 'No data rows found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse headers and create column index map
    const headers = rows[0].map(h => h.toLowerCase().trim());
    const columnMapping = syncConfig.column_mapping as ColumnMapping;

    const findColumnIndex = (mappedName: string): number => {
      const normalizedMapped = mappedName.toLowerCase().trim();
      return headers.findIndex(h => h.includes(normalizedMapped) || normalizedMapped.includes(h));
    };

    const nameIndex = findColumnIndex(columnMapping.name || 'name');
    const landingPageIndex = columnMapping.landing_page ? findColumnIndex(columnMapping.landing_page) : -1;
    const typeIndex = columnMapping.campaign_type ? findColumnIndex(columnMapping.campaign_type) : -1;
    const descIndex = columnMapping.description ? findColumnIndex(columnMapping.description) : -1;

    if (nameIndex === -1) {
      await supabase
        .from('google_sheets_campaign_sync')
        .update({ 
          sync_status: 'error', 
          sync_error: `Could not find name column "${columnMapping.name}" in sheet headers: ${headers.join(', ')}` 
        })
        .eq('id', syncConfigId);

      return new Response(
        JSON.stringify({ error: 'Name column not found in sheet' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process data rows
    const dataRows = rows.slice(1);
    const campaigns = [];
    const errors: string[] = [];

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const name = row[nameIndex]?.trim();

      if (!name) {
        continue; // Skip empty rows
      }

      const campaign = {
        name,
        landing_page: landingPageIndex >= 0 ? row[landingPageIndex]?.trim() || null : null,
        campaign_type: typeIndex >= 0 ? row[typeIndex]?.trim() || null : null,
        description: descIndex >= 0 ? row[descIndex]?.trim() || null : null,
        is_active: true,
      };

      campaigns.push(campaign);
    }

    console.log(`Parsed ${campaigns.length} campaigns from sheet`);

    // Upsert campaigns (update existing, insert new)
    let synced = 0;
    let created = 0;
    let updated = 0;

    for (const campaign of campaigns) {
      // Check if campaign exists
      const { data: existing } = await supabase
        .from('utm_campaigns')
        .select('id')
        .eq('name', campaign.name)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { error: updateError } = await supabase
          .from('utm_campaigns')
          .update({
            landing_page: campaign.landing_page,
            campaign_type: campaign.campaign_type,
            description: campaign.description,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (updateError) {
          errors.push(`Failed to update "${campaign.name}": ${updateError.message}`);
        } else {
          updated++;
          synced++;
        }
      } else {
        // Insert new
        const { error: insertError } = await supabase
          .from('utm_campaigns')
          .insert({
            name: campaign.name,
            landing_page: campaign.landing_page,
            campaign_type: campaign.campaign_type,
            description: campaign.description,
            is_active: true,
            use_count: 0,
          });

        if (insertError) {
          errors.push(`Failed to create "${campaign.name}": ${insertError.message}`);
        } else {
          created++;
          synced++;
        }
      }
    }

    // Update sync status
    await supabase
      .from('google_sheets_campaign_sync')
      .update({ 
        sync_status: errors.length > 0 ? 'error' : 'success',
        sync_error: errors.length > 0 ? errors.slice(0, 5).join('; ') : null,
        last_synced_at: new Date().toISOString(),
        sync_count: (syncConfig.sync_count || 0) + 1
      })
      .eq('id', syncConfigId);

    console.log(`Sync complete: ${synced} synced (${created} new, ${updated} updated), ${errors.length} errors`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        synced, 
        created, 
        updated, 
        errors: errors.slice(0, 5),
        totalRows: campaigns.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Sync error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});