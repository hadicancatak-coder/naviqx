import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { randomBytes } from 'https://deno.land/std@0.177.0/node/crypto.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to extract client IP only (first IP from x-forwarded-for)
const getClientIp = (req: Request): string => {
  const forwardedFor = req.headers.get('x-forwarded-for') || '';
  const cfConnectingIp = req.headers.get('cf-connecting-ip') || '';
  
  // Extract first IP from x-forwarded-for (the client IP)
  if (forwardedFor) {
    const firstIp = forwardedFor.split(',')[0].trim();
    return firstIp || 'unknown';
  }
  
  return cfConnectingIp || 'unknown';
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { action, sessionToken } = await req.json();

    // Phase 5: Add refresh action for token renewal
    if (action === 'refresh') {
      if (!sessionToken) {
        throw new Error('Session token required for refresh');
      }

      const { data: session, error: queryError } = await supabase
        .from('mfa_sessions')
        .select('id, expires_at')
        .eq('session_token', sessionToken)
        .eq('user_id', user.id)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (!session || queryError) {
        return new Response(
          JSON.stringify({ error: 'Invalid or expired session' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Extend expiry by 24 hours
      const newExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      
      const { error: updateError } = await supabase
        .from('mfa_sessions')
        .update({ expires_at: newExpiresAt })
        .eq('id', session.id);

      if (updateError) {
        throw new Error('Failed to refresh session');
      }

      return new Response(
        JSON.stringify({ 
          sessionToken,
          expiresAt: newExpiresAt,
          refreshed: true 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'create') {
      // Create new MFA session after successful verification
      const sessionTokenValue = randomBytes(32).toString('hex');
      const ipAddress = getClientIp(req);
      const userAgent = req.headers.get('user-agent') || 'unknown';
      
      // Explicit 24-hour expiry for once-per-day MFA
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      const { error: insertError } = await supabase
        .from('mfa_sessions')
        .insert({
          user_id: user.id,
          session_token: sessionTokenValue,
          ip_address: ipAddress,
          user_agent: userAgent,
          expires_at: expiresAt,
          skip_validation_for_ip: false  // SECURITY: Enable IP validation - require re-auth on IP change
        });

      if (insertError) {
        console.error('Failed to create MFA session');
        throw new Error('Failed to create session');
      }

      return new Response(
        JSON.stringify({ sessionToken: sessionTokenValue, expiresAt }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'validate') {
      // Optimized: validate existing MFA session with IP check
      if (!sessionToken) {
        return new Response(
          JSON.stringify({ valid: false, reason: 'no_token' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const currentIp = getClientIp(req);

      const { data: session } = await supabase
        .from('mfa_sessions')
        .select('id, expires_at, ip_address, skip_validation_for_ip')
        .eq('session_token', sessionToken)
        .eq('user_id', user.id)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (!session) {
        return new Response(
          JSON.stringify({ valid: false, reason: 'expired' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const ipMatch = session.skip_validation_for_ip || session.ip_address === currentIp;

      if (!ipMatch) {
        return new Response(
          JSON.stringify({ valid: false, reason: 'ip_mismatch' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ valid: true, sameIp: ipMatch, expiresAt: session.expires_at }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'cleanup') {
      // Cleanup expired sessions
      await supabase
        .from('mfa_sessions')
        .delete()
        .lt('expires_at', new Date().toISOString());

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Invalid action');

  } catch (error: any) {
    console.error('Error in manage-mfa-session');
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
