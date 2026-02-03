import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CampaignImportRow {
  name: string;
  landing_page?: string;
  campaign_type?: string;
  description?: string;
  entity?: string;
  status?: string;
  version_notes?: string;
  asset_link?: string;
  version_number?: number;
}

interface ImportResult {
  campaign_id: string;
  action: "created" | "updated";
  entity: string | null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get auth token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create Supabase client with user's auth token
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request body
    const { campaigns }: { campaigns: CampaignImportRow[] } = await req.json();

    if (!campaigns || !Array.isArray(campaigns) || campaigns.length === 0) {
      return new Response(JSON.stringify({ error: "No campaigns provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[campaign-bulk-import] Processing ${campaigns.length} campaigns for user ${user.id}`);

    // Fetch existing campaigns to check for matches
    const { data: existingCampaigns } = await supabase
      .from("utm_campaigns")
      .select("id, name")
      .eq("is_active", true);

    const existingMap = new Map(
      existingCampaigns?.map((c) => [c.name.toLowerCase(), c.id]) || []
    );

    const results: ImportResult[] = [];
    let created = 0;
    let updated = 0;
    let versionsCreated = 0;
    const errors: string[] = [];

    for (const campaign of campaigns) {
      if (!campaign.name?.trim()) {
        errors.push("Campaign with empty name skipped");
        continue;
      }

      try {
        const existingId = existingMap.get(campaign.name.toLowerCase());
        let campaignId: string;
        let action: "created" | "updated";

        if (existingId) {
          // Update existing campaign
          const { error: updateError } = await supabase
            .from("utm_campaigns")
            .update({
              landing_page: campaign.landing_page || null,
              campaign_type: campaign.campaign_type || "Branding",
              description: campaign.description || null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingId);

          if (updateError) {
            errors.push(`Failed to update ${campaign.name}: ${updateError.message}`);
            continue;
          }

          campaignId = existingId;
          action = "updated";
          updated++;
        } else {
          // Create new campaign
          const { data: newCampaign, error: insertError } = await supabase
            .from("utm_campaigns")
            .insert({
              name: campaign.name,
              landing_page: campaign.landing_page || null,
              campaign_type: campaign.campaign_type || "Branding",
              description: campaign.description || null,
              created_by: user.id,
              is_active: true,
            })
            .select("id")
            .single();

          if (insertError) {
            errors.push(`Failed to create ${campaign.name}: ${insertError.message}`);
            continue;
          }

          campaignId = newCampaign.id;
          action = "created";
          created++;

          // Add to map to prevent duplicates in same batch
          existingMap.set(campaign.name.toLowerCase(), campaignId);
        }

        // Create entity tracking if entity is provided
        if (campaign.entity?.trim()) {
          const { error: trackingError } = await supabase
            .from("campaign_entity_tracking")
            .upsert(
              {
                campaign_id: campaignId,
                entity: campaign.entity,
                status: campaign.status || "Draft",
                created_by: user.id,
              },
              {
                onConflict: "campaign_id,entity",
                ignoreDuplicates: false,
              }
            );

          if (trackingError) {
            console.warn(`Tracking upsert warning for ${campaign.name}:`, trackingError);
          }
        }

        // Create version if version data is provided
        const hasVersionData = !!(campaign.version_notes?.trim() || campaign.asset_link?.trim());
        if (hasVersionData) {
          // Get next version number
          let versionNumber = campaign.version_number;
          if (!versionNumber) {
            const { data: latestVersion } = await supabase
              .from("utm_campaign_versions")
              .select("version_number")
              .eq("utm_campaign_id", campaignId)
              .order("version_number", { ascending: false })
              .limit(1)
              .single();

            versionNumber = (latestVersion?.version_number || 0) + 1;
          }

          const { error: versionError } = await supabase
            .from("utm_campaign_versions")
            .insert({
              utm_campaign_id: campaignId,
              version_number: versionNumber,
              version_notes: campaign.version_notes || null,
              asset_link: campaign.asset_link || null,
              name: campaign.name,
              landing_page: campaign.landing_page || null,
              created_by: user.id,
            });

          if (!versionError) {
            versionsCreated++;
          } else {
            console.warn(`Version creation warning for ${campaign.name}:`, versionError);
          }
        }

        results.push({
          campaign_id: campaignId,
          action,
          entity: campaign.entity || null,
        });
      } catch (error) {
        console.error(`Error processing campaign ${campaign.name}:`, error);
        errors.push(`Error processing ${campaign.name}`);
      }
    }

    console.log(`[campaign-bulk-import] Complete: ${created} created, ${updated} updated, ${versionsCreated} versions, ${errors.length} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        created,
        updated,
        versionsCreated,
        errors: errors.length > 0 ? errors : undefined,
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[campaign-bulk-import] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
