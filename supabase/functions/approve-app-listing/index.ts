import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { access_token, action, reviewer_name, reviewer_email, review_notes } = await req.json();

    if (!access_token || !action) {
      return new Response(JSON.stringify({ error: "Missing access_token or action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!["approve", "request_changes"].includes(action)) {
      return new Response(JSON.stringify({ error: "Invalid action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify access token
    const { data: link, error: linkError } = await supabase
      .from("public_access_links")
      .select("resource_id, resource_type, is_active")
      .eq("access_token", access_token)
      .single();

    if (linkError || !link || !link.is_active || link.resource_type !== "app_store") {
      return new Response(JSON.stringify({ error: "Invalid or expired link" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const updates: Record<string, unknown> = {};

    if (action === "approve") {
      updates.status = "approved";
      updates.approved_by = reviewer_name || reviewer_email || "External Reviewer";
      updates.approved_at = new Date().toISOString();
      updates.review_notes = null;
    } else {
      updates.status = "needs_changes";
      updates.review_notes = review_notes || "Changes requested by reviewer";
      updates.approved_by = null;
      updates.approved_at = null;
    }

    const { error: updateError } = await supabase
      .from("app_store_listings")
      .update(updates)
      .eq("id", link.resource_id);

    if (updateError) {
      return new Response(JSON.stringify({ error: "Failed to update listing" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, action }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
