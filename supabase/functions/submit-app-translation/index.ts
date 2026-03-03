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
    const {
      access_token,
      locale,
      translator_email,
      translator_name,
      app_name,
      subtitle,
      short_description,
      promotional_text,
      description,
      keywords,
      whats_new,
    } = await req.json();

    // Validate required fields
    if (!access_token || !locale || !translator_email) {
      return new Response(
        JSON.stringify({ error: "Missing access_token, locale, or translator_email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate email format
    if (typeof translator_email !== "string" || !translator_email.includes("@")) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
      return new Response(
        JSON.stringify({ error: "Invalid or expired link" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate email domain against app_settings
    const { data: settingsData } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "allowed_domains")
      .single();

    let allowedDomains: string[] = ["cfi.trade"];
    if (settingsData?.value) {
      const val = settingsData.value;
      if (Array.isArray(val)) {
        allowedDomains = val.map((d: unknown) => String(d).toLowerCase());
      } else if (typeof val === "string") {
        allowedDomains = val.split(",").map((d: string) => d.trim().toLowerCase());
      }
    }

    const emailDomain = translator_email.toLowerCase().split("@")[1];
    if (!allowedDomains.includes(emailDomain)) {
      return new Response(
        JSON.stringify({
          error: `Only emails from ${allowedDomains.map((d: string) => "@" + d).join(", ")} are allowed`,
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the listing to find created_by for the upsert
    const { data: listingData, error: listingError } = await supabase
      .from("app_store_listings")
      .select("created_by")
      .eq("id", link.resource_id)
      .single();

    if (listingError || !listingData) {
      return new Response(
        JSON.stringify({ error: "Listing not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Upsert translation
    const toNull = (v: unknown) =>
      typeof v === "string" && v.trim() ? v.trim() : null;

    const { error: upsertError } = await supabase
      .from("app_store_translations")
      .upsert(
        {
          listing_id: link.resource_id,
          locale,
          created_by: listingData.created_by,
          translated_by: `${translator_name || ""} <${translator_email}>`.trim(),
          status: "ready_for_review",
          app_name: toNull(app_name),
          subtitle: toNull(subtitle),
          short_description: toNull(short_description),
          promotional_text: toNull(promotional_text),
          description: toNull(description),
          keywords: toNull(keywords),
          whats_new: toNull(whats_new),
        },
        { onConflict: "listing_id,locale" }
      );

    if (upsertError) {
      console.error("Upsert error:", upsertError);
      return new Response(
        JSON.stringify({ error: "Failed to save translation" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
