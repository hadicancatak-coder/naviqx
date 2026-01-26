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

    // Parse request body if present
    let verifyOtp;
    try {
      const body = await req.json();
      verifyOtp = body.verifyOtp;
      
      // Validate OTP format if provided
      if (verifyOtp !== undefined) {
        if (typeof verifyOtp !== 'string') {
          return new Response(
            JSON.stringify({ error: 'OTP code must be a string' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        if (!/^\d{6}$/.test(verifyOtp)) {
          return new Response(
            JSON.stringify({ error: 'OTP code must be 6 digits' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    } catch {
      // No body provided - this is the initial QR code request
      verifyOtp = undefined;
    }

    // Get or create secret from secure table
    let { data: mfaSecrets } = await supabase
      .from('user_mfa_secrets')
      .select('mfa_secret')
      .eq('user_id', user.id)
      .single();

    let secret = mfaSecrets?.mfa_secret;
    
    if (!secret) {
      // Generate new secret (base32, 20 bytes = 160 bits)
      secret = new OTPAuth.Secret({ size: 20 }).base32;
    }

    // If verifying OTP
    if (verifyOtp) {
      const totp = new OTPAuth.TOTP({
        secret: OTPAuth.Secret.fromBase32(secret),
        digits: 6,
        period: 30,
      });

      const isValid = totp.validate({ token: verifyOtp, window: 1 }) !== null;

      if (!isValid) {
        return new Response(
          JSON.stringify({ error: 'Invalid OTP code' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Generate 10 backup codes
      const backupCodes = [];
      for (let i = 0; i < 10; i++) {
        const code = Math.random().toString(36).substring(2, 10).toUpperCase();
        backupCodes.push(code);
      }

      // Save to secure MFA table
      const { error: mfaError } = await supabase
        .from('user_mfa_secrets')
        .upsert({
          user_id: user.id,
          mfa_secret: secret,
          mfa_backup_codes: backupCodes,
          mfa_enrolled_at: new Date().toISOString()
        });

      if (mfaError) {
        console.error('Error saving MFA secrets:', mfaError);
        throw new Error('Failed to save MFA secrets');
      }

      // Update profiles table to mark MFA as enabled
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          mfa_enabled: true
        })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Error updating profile:', updateError);
        throw new Error('Failed to save MFA settings');
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          backupCodes: backupCodes
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user email for QR code
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('user_id', user.id)
      .single();

    // Generate TOTP URI
    const totp = new OTPAuth.TOTP({
      issuer: 'Naviqx',
      label: profile?.email || user.email || '',
      secret: OTPAuth.Secret.fromBase32(secret),
      digits: 6,
      period: 30,
    });

    const otpauth = totp.toString();

    // Save secret temporarily (not enabled yet)
    await supabase
      .from('user_mfa_secrets')
      .upsert({
        user_id: user.id,
        mfa_secret: secret
      });

    return new Response(
      JSON.stringify({
        secret: secret,
        otpauth: otpauth
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in setup-mfa:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
