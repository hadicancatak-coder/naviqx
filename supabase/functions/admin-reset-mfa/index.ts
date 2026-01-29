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

    // Verify the requesting user is authenticated
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user: adminUser }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !adminUser) {
      console.error('Unauthorized: No valid user');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the user has admin role
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', adminUser.id)
      .single();

    if (roleError || roleData?.role !== 'admin') {
      console.error('Forbidden: User is not admin');
      return new Response(
        JSON.stringify({ error: 'Forbidden - Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: unknown = await req.json();
    const targetUserId = (body && typeof body === 'object' && 'targetUserId' in body) 
      ? (body as { targetUserId: unknown }).targetUserId 
      : undefined;

    if (!targetUserId || typeof targetUserId !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Target user ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Admin ${adminUser.email} resetting MFA for user ${targetUserId}`);

    // Get target user info for audit
    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('email, name')
      .eq('user_id', targetUserId)
      .single();

    // 1. Delete MFA secrets
    const { error: secretsError } = await supabase
      .from('user_mfa_secrets')
      .delete()
      .eq('user_id', targetUserId);

    if (secretsError) {
      console.error('Error deleting MFA secrets:', secretsError);
    }

    // 2. Delete all MFA sessions
    const { error: sessionsError } = await supabase
      .from('mfa_sessions')
      .delete()
      .eq('user_id', targetUserId);

    if (sessionsError) {
      console.error('Error deleting MFA sessions:', sessionsError);
    }

    // 3. Delete backup codes
    const { error: backupError } = await supabase
      .from('mfa_backup_codes')
      .delete()
      .eq('user_id', targetUserId);

    if (backupError) {
      console.error('Error deleting backup codes:', backupError);
    }

    // 4. Reset MFA flags in profile
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        mfa_enabled: false,
        mfa_enrolled: false,
        mfa_backup_codes_generated_at: null,
        last_mfa_prompt_at: null,
        // Keep mfa_enrollment_required = true so user must set up MFA again
      })
      .eq('user_id', targetUserId);

    if (profileError) {
      console.error('Error updating profile:', profileError);
      throw new Error('Failed to reset MFA status');
    }

    // 5. Audit the action
    const { error: auditError } = await supabase
      .from('admin_audit_log')
      .insert({
        admin_id: adminUser.id,
        action: 'mfa_reset',
        target_user_id: targetUserId,
        changes: {
          action: 'MFA reset',
          target_email: targetProfile?.email,
          target_name: targetProfile?.name,
        },
        ip_address: req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
        user_agent: req.headers.get('user-agent') || 'unknown',
      });

    if (auditError) {
      console.error('Audit log error:', auditError);
    }

    console.log(`MFA reset successful for user ${targetUserId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'MFA has been reset. User will be required to set up MFA again on next login.',
        targetUser: {
          email: targetProfile?.email,
          name: targetProfile?.name,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in admin-reset-mfa:', error);
    const message = error instanceof Error ? error.message : 'Failed to reset MFA';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
