import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import * as OTPAuth from 'https://esm.sh/otpauth@9.2.2';

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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const token = authHeader.replace('Bearer ', '');
    
    // Retry auth check once on transient failure
    let user = null;
    let userError = null;
    
    for (let attempt = 0; attempt < 2; attempt++) {
      const result = await supabase.auth.getUser(token);
      user = result.data?.user;
      userError = result.error;
      
      if (user) break;
      
      // Wait 100ms before retry
      if (attempt === 0 && userError) {
        await new Promise(r => setTimeout(r, 100));
      }
    }

    if (userError || !user) {
      console.error('Auth failed after retries:', userError?.message);
      return new Response(
        JSON.stringify({ error: 'Unauthorized', reason: userError?.message || 'No user found' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { otpCode, isBackupCode } = await req.json();

    // Validate input types
    if (typeof isBackupCode !== 'boolean') {
      return new Response(
        JSON.stringify({ error: 'isBackupCode must be a boolean' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (typeof otpCode !== 'string') {
      return new Response(
        JSON.stringify({ error: 'OTP code must be a string' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate OTP format
    if (!isBackupCode && !/^\d{6}$/.test(otpCode)) {
      return new Response(
        JSON.stringify({ error: 'OTP code must be 6 digits' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate backup code format
    if (isBackupCode && (otpCode.length < 6 || otpCode.length > 20)) {
      return new Response(
        JSON.stringify({ error: 'Invalid backup code format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rate limiting: Check failed attempts in last 15 minutes
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    
    const { data: recentAttempts } = await supabase
      .from('mfa_verification_attempts')
      .select('id')
      .eq('user_id', user.id)
      .eq('success', false)
      .gte('attempt_time', fifteenMinutesAgo);

    if (recentAttempts && recentAttempts.length >= 5) {
      return new Response(
        JSON.stringify({ 
          error: 'Too many failed attempts. Please try again in 15 minutes.' 
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's MFA data from secure table
    const { data: mfaSecrets } = await supabase
      .from('user_mfa_secrets')
      .select('mfa_secret, mfa_backup_codes')
      .eq('user_id', user.id)
      .single();

    if (!mfaSecrets?.mfa_secret) {
      throw new Error('MFA not set up for this user');
    }

    let isValid = false;

    if (isBackupCode) {
      // Check backup code
      const backupCodes = mfaSecrets.mfa_backup_codes || [];
      isValid = backupCodes.includes(otpCode);

      if (isValid) {
        // Remove used backup code
        const updatedCodes = backupCodes.filter((code: string) => code !== otpCode);
        await supabase
          .from('user_mfa_secrets')
          .update({ mfa_backup_codes: updatedCodes })
          .eq('user_id', user.id);
      }
    } else {
      // Verify TOTP code
      const totp = new OTPAuth.TOTP({
        secret: OTPAuth.Secret.fromBase32(mfaSecrets.mfa_secret),
        digits: 6,
        period: 30,
      });
      
      isValid = totp.validate({ token: otpCode, window: 1 }) !== null;
    }

    // Log attempt
    await supabase
      .from('mfa_verification_attempts')
      .insert({
        user_id: user.id,
        success: isValid,
        ip_address: req.headers.get('x-forwarded-for') || 'unknown'
      });

    if (!isValid) {
      return new Response(
        JSON.stringify({ error: 'Invalid code' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in verify-mfa-otp:', error);
    const message = error instanceof Error ? error.message : 'An error occurred';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
