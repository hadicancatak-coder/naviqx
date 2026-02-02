import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin role
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleData?.role !== 'admin') {
      throw new Error('Admin access required');
    }

    const { usersToKeep } = await req.json();
    
    console.log('Cleaning database, keeping users:', usersToKeep);

    // Get all profiles except the ones to keep
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id')
      .not('user_id', 'in', `(${usersToKeep.join(',')})`);

    if (!profiles || profiles.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No users to delete' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userIdsToDelete = profiles.map(p => p.user_id);

    // Clean assignees
    await supabase.from('task_assignees').delete().in('user_id', userIdsToDelete);
    await supabase.from('campaign_assignees').delete().in('user_id', userIdsToDelete);
    await supabase.from('project_assignees').delete().in('user_id', userIdsToDelete);
    await supabase.from('launch_campaign_assignees').delete().in('user_id', userIdsToDelete);
    await supabase.from('blocker_assignees').delete().in('user_id', userIdsToDelete);

    // Delete users using admin API
    const deletePromises = userIdsToDelete.map(userId =>
      supabase.auth.admin.deleteUser(userId)
    );

    await Promise.all(deletePromises);

    console.log(`Deleted ${userIdsToDelete.length} users and their assignees`);

    return new Response(
      JSON.stringify({ 
        success: true,
        deletedCount: userIdsToDelete.length,
        deletedUsers: userIdsToDelete
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in delete-users:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

