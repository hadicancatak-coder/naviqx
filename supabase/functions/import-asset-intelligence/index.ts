import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ParsedAsset {
  asset_text: string;
  asset_type: string;
  google_asset_id: string;
  policy_status: string;
  review_status: string;
  level: string;
  interactions: number;
  interaction_rate: number;
  conversions: number;
  added_by: string;
  is_eligible: boolean;
}

function detectLanguage(text: string): string {
  const arabicPattern = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;
  return arabicPattern.test(text) ? "AR" : "EN";
}

function parseInteractionRate(rate: string): number {
  if (!rate || rate === "--" || rate === "") return 0;
  return parseFloat(rate.replace("%", "")) || 0;
}

function parseNumber(val: string): number {
  if (!val || val === "--" || val === "") return 0;
  return parseFloat(val.replace(/,/g, "")) || 0;
}

function extractAssetText(assetBlock: string): { text: string; type: string; assetId: string; policyStatus: string; reviewStatus: string } {
  let text = "";
  let type = "";
  let assetId = "";
  let policyStatus = "approved";
  let reviewStatus = "reviewed";

  // Extract asset_id
  const idMatch = assetBlock.match(/asset_id:\s*(\d+)/);
  if (idMatch) assetId = idMatch[1];

  // Extract policy info
  const approvalMatch = assetBlock.match(/approval_status:\s*(\w+)/);
  if (approvalMatch) policyStatus = approvalMatch[1].toLowerCase();

  const reviewMatch = assetBlock.match(/review_state:\s*(\w+)/);
  if (reviewMatch) reviewStatus = reviewMatch[1].toLowerCase();

  // Extract text_asset
  const textMatch = assetBlock.match(/text_asset\s*\{[^}]*text:\s*\"([^"]*(?:""[^"]*)*)\"/s);
  if (textMatch) {
    text = textMatch[1].replace(/""/g, '"');
    // Decode octal-encoded UTF-8 (Arabic text from Google export)
    text = decodeOctalUtf8(text);
  }

  // Extract callout_asset
  const calloutMatch = assetBlock.match(/callout_asset\s*\{[^}]*callout_text:\s*\"([^"]*(?:""[^"]*)*)\"/s);
  if (calloutMatch) {
    text = calloutMatch[1].replace(/""/g, '"');
    type = "Callout";
  }

  // Extract sitelink_asset
  const sitelinkMatch = assetBlock.match(/sitelink_asset\s*\{[^}]*link_text:\s*\"([^"]*(?:""[^"]*)*)\"/s);
  if (sitelinkMatch) {
    text = sitelinkMatch[1].replace(/""/g, '"');
    type = "Sitelink";
    // Also grab descriptions for context
    const desc1Match = assetBlock.match(/description_1:\s*\"([^"]*(?:""[^"]*)*)\"/);
    const desc2Match = assetBlock.match(/description_2:\s*\"([^"]*(?:""[^"]*)*)\"/);
    if (desc1Match || desc2Match) {
      const desc1 = desc1Match ? desc1Match[1].replace(/""/g, '"') : "";
      const desc2 = desc2Match ? desc2Match[1].replace(/""/g, '"') : "";
      if (desc1 || desc2) {
        text += ` | ${desc1} ${desc2}`.trim();
      }
    }
  }

  // Extract structured_snippet_asset
  const snippetMatch = assetBlock.match(/structured_snippet_asset\s*\{[^}]*header:\s*\"([^"]*)\"/s);
  if (snippetMatch) {
    text = snippetMatch[1].replace(/""/g, '"');
    const valuesMatches = assetBlock.matchAll(/values:\s*\"([^"]*)\"/g);
    const values: string[] = [];
    for (const m of valuesMatches) {
      values.push(m[1].replace(/""/g, '"'));
    }
    if (values.length) text += ": " + values.join(", ");
    type = "Structured Snippet";
  }

  return { text: text.trim(), type, assetId, policyStatus, reviewStatus };
}

function decodeOctalUtf8(str: string): string {
  // Match sequences of octal escapes like \\330\\271\\331\\202
  try {
    const bytes: number[] = [];
    let i = 0;
    let result = "";
    while (i < str.length) {
      if (str[i] === "\\" && i + 3 < str.length && /[0-3]/.test(str[i + 1])) {
        // Collect consecutive octal sequences
        while (i < str.length && str[i] === "\\" && i + 3 <= str.length && /[0-3]/.test(str[i + 1])) {
          const octal = str.substring(i + 1, i + 4);
          bytes.push(parseInt(octal, 8));
          i += 4;
        }
        // Decode the bytes as UTF-8
        const decoder = new TextDecoder("utf-8");
        result += decoder.decode(new Uint8Array(bytes));
        bytes.length = 0;
      } else {
        result += str[i];
        i++;
      }
    }
    return result;
  } catch {
    return str;
  }
}

function parseCSV(rawText: string, entity: string): ParsedAsset[] {
  const assets: ParsedAsset[] = [];

  // Split by lines and reconstruct records
  // Each record starts with "Enabled," or "Paused," and the asset block is wrapped in quotes
  const lines = rawText.split("\n");
  let currentRecord = "";
  let inRecord = false;

  for (let i = 1; i < lines.length; i++) {
    // Skip header
    const line = lines[i];
    if (!line.trim()) continue;

    if (
      (line.startsWith("Enabled,") || line.startsWith("Paused,")) &&
      !inRecord
    ) {
      // Start a new record
      if (currentRecord) {
        const parsed = parseRecord(currentRecord);
        if (parsed) assets.push(parsed);
      }
      currentRecord = line;
      // Check if the quoted field is still open
      inRecord = isQuoteOpen(currentRecord);
    } else if (inRecord) {
      currentRecord += "\n" + line;
      inRecord = isQuoteOpen(currentRecord);
    } else if (
      line.startsWith("Enabled,") ||
      line.startsWith("Paused,")
    ) {
      if (currentRecord) {
        const parsed = parseRecord(currentRecord);
        if (parsed) assets.push(parsed);
      }
      currentRecord = line;
      inRecord = isQuoteOpen(currentRecord);
    } else {
      currentRecord += "\n" + line;
    }
  }
  // Parse last record
  if (currentRecord) {
    const parsed = parseRecord(currentRecord);
    if (parsed) assets.push(parsed);
  }

  return assets;
}

function isQuoteOpen(text: string): boolean {
  // Count unescaped quotes after first comma
  const firstComma = text.indexOf(",");
  if (firstComma === -1) return false;
  const afterComma = text.substring(firstComma + 1);
  let quoteCount = 0;
  for (let i = 0; i < afterComma.length; i++) {
    if (afterComma[i] === '"') quoteCount++;
  }
  return quoteCount % 2 !== 0;
}

function parseRecord(record: string): ParsedAsset | null {
  try {
    // Extract the status (Enabled/Paused)
    const statusEnd = record.indexOf(",");
    if (statusEnd === -1) return null;

    // Find the quoted asset block
    const quoteStart = record.indexOf('"', statusEnd);
    if (quoteStart === -1) return null;

    // Find matching closing quote - handle escaped quotes ("")
    let quoteEnd = -1;
    let i = quoteStart + 1;
    while (i < record.length) {
      if (record[i] === '"') {
        if (i + 1 < record.length && record[i + 1] === '"') {
          i += 2; // Skip escaped quote
        } else {
          quoteEnd = i;
          break;
        }
      } else {
        i++;
      }
    }
    if (quoteEnd === -1) return null;

    const assetBlock = record.substring(quoteStart + 1, quoteEnd);

    // Parse the trailing CSV fields after the quoted block
    const trailing = record.substring(quoteEnd + 2); // skip quote and comma
    const trailingParts = trailing.split(",").map((s) => s.trim());

    // Expected: AssetType, Level, Status, StatusReason, AddedBy, LastUpdated, Interactions, InteractionRate, Conversions
    const assetTypeField = trailingParts[0] || "";
    const levelField = trailingParts[1] || "";
    const statusField = trailingParts[2] || "";
    const addedByField = trailingParts[4] || "Advertiser";

    // Interactions, rate, conversions are at the end
    const interactionsStr = trailingParts[trailingParts.length - 3] || "0";
    const rateStr = trailingParts[trailingParts.length - 2] || "0";
    const conversionsStr = trailingParts[trailingParts.length - 1] || "0";

    const { text, type, assetId, policyStatus, reviewStatus } =
      extractAssetText(assetBlock);
    if (!text) return null;

    const finalType = type || assetTypeField;
    const isEligible = statusField === "Eligible";

    // Determine policy status from block or status field
    let finalPolicyStatus = policyStatus;
    if (statusField === "Not eligible" || statusField === "Disapproved") {
      finalPolicyStatus = "disapproved";
    } else if (isEligible && finalPolicyStatus !== "disapproved") {
      finalPolicyStatus = "approved";
    }

    return {
      asset_text: text,
      asset_type: finalType,
      google_asset_id: assetId,
      policy_status: finalPolicyStatus,
      review_status: reviewStatus,
      level: levelField,
      interactions: parseNumber(interactionsStr),
      interaction_rate: parseInteractionRate(rateStr),
      conversions: parseNumber(conversionsStr),
      added_by: addedByField,
      is_eligible: isEligible,
    };
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !authUser) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = authUser.id;

    // Check admin role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const entity = formData.get("entity") as string;

    if (!file || !entity) {
      return new Response(
        JSON.stringify({ error: "File and entity are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const rawText = await file.text();
    const parsedAssets = parseCSV(rawText, entity);

    // Aggregate by asset_text + asset_type
    const aggregated = new Map<
      string,
      {
        asset_text: string;
        asset_type: string;
        google_asset_id: string;
        level: string;
        total_interactions: number;
        interaction_rate: number;
        total_conversions: number;
        appearance_count: number;
        approved_count: number;
        disapproved_count: number;
        best_interaction_rate: number;
        added_by: string;
        language: string;
      }
    >();

    for (const asset of parsedAssets) {
      const key = `${asset.asset_text}|||${asset.asset_type}`;
      const existing = aggregated.get(key);
      if (existing) {
        existing.total_interactions += asset.interactions;
        existing.total_conversions += asset.conversions;
        existing.appearance_count += 1;
        if (asset.policy_status === "approved") existing.approved_count += 1;
        if (asset.policy_status === "disapproved")
          existing.disapproved_count += 1;
        if (asset.interaction_rate > existing.best_interaction_rate)
          existing.best_interaction_rate = asset.interaction_rate;
        // Keep the best interaction rate as average
        existing.interaction_rate =
          (existing.interaction_rate * (existing.appearance_count - 1) +
            asset.interaction_rate) /
          existing.appearance_count;
      } else {
        aggregated.set(key, {
          asset_text: asset.asset_text,
          asset_type: asset.asset_type,
          google_asset_id: asset.google_asset_id,
          level: asset.level,
          total_interactions: asset.interactions,
          interaction_rate: asset.interaction_rate,
          total_conversions: asset.conversions,
          appearance_count: 1,
          approved_count: asset.policy_status === "approved" ? 1 : 0,
          disapproved_count: asset.policy_status === "disapproved" ? 1 : 0,
          best_interaction_rate: asset.interaction_rate,
          added_by: asset.added_by,
          language: detectLanguage(asset.asset_text),
        });
      }
    }

    // Upsert into database
    let inserted = 0;
    let updated = 0;
    let errors = 0;

    for (const [, agg] of aggregated) {
      const policyStatus =
        agg.approved_count > 0 && agg.disapproved_count > 0
          ? "mixed"
          : agg.disapproved_count > 0
          ? "disapproved"
          : "approved";

      const { error } = await supabase.from("asset_intelligence").upsert(
        {
          entity,
          asset_text: agg.asset_text,
          asset_type: agg.asset_type,
          google_asset_id: agg.google_asset_id,
          policy_status: policyStatus,
          review_status: "reviewed",
          level: agg.level,
          total_interactions: agg.total_interactions,
          interaction_rate: Math.round(agg.interaction_rate * 100) / 100,
          total_conversions: agg.total_conversions,
          appearance_count: agg.appearance_count,
          approved_count: agg.approved_count,
          disapproved_count: agg.disapproved_count,
          best_interaction_rate:
            Math.round(agg.best_interaction_rate * 100) / 100,
          added_by: agg.added_by,
          language: agg.language,
          created_by: userId,
        },
        { onConflict: "entity,asset_text,asset_type" }
      );

      if (error) {
        console.error("Upsert error:", error);
        errors++;
      } else {
        inserted++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          total_parsed: parsedAssets.length,
          unique_assets: aggregated.size,
          upserted: inserted,
          errors,
          entity,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Import error:", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
