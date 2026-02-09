import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Create client with user's token to verify they're admin
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: adminUser }, error: authError } = await userClient.auth.getUser();
    if (authError || !adminUser) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user is admin
    const { data: roleData } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", adminUser.id)
      .single();

    if (roleData?.role !== "admin") {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { targetUserId, targetEmail } = await req.json();

    if (!targetUserId || !targetEmail) {
      return new Response(JSON.stringify({ error: "Target user ID and email required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create admin client with service role key
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Generate password reset link using admin API
    const { data, error } = await adminClient.auth.admin.generateLink({
      type: "recovery",
      email: targetEmail,
    });

    if (error) {
      console.error("Error generating reset link:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build the reset link for the app
    // The action_link from Supabase points to their domain, so we construct our own
    // using the hashed_token which can be used with verifyOtp
    const hashedToken = data.properties?.hashed_token;
    const appUrl = Deno.env.get("APP_URL") || "https://naviqx.lovable.app";
    
    // Construct a reset link that goes to our app's reset-password page
    const resetLink = hashedToken 
      ? `${appUrl}/reset-password?token_hash=${hashedToken}&type=recovery`
      : data.properties?.action_link;

    // Log the admin action
    await userClient.from("admin_audit_log").insert({
      admin_id: adminUser.id,
      action: "password_reset_initiated",
      target_user_id: targetUserId,
      changes: { email: targetEmail },
    });

    console.log(`Password reset initiated for ${targetEmail} by admin ${adminUser.id}`);
    console.log(`Reset link generated: ${resetLink ? 'yes' : 'no'}, hashed_token: ${hashedToken ? 'yes' : 'no'}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Password reset link generated",
        resetLink: resetLink
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Error in admin-reset-password:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
