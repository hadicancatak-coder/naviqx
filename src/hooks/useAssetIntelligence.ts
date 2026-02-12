import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AssetIntelligenceRow {
  id: string;
  entity: string;
  asset_text: string;
  asset_type: string;
  google_asset_id: string | null;
  policy_status: string;
  review_status: string | null;
  level: string | null;
  total_interactions: number;
  interaction_rate: number;
  total_conversions: number;
  appearance_count: number;
  approved_count: number;
  disapproved_count: number;
  best_interaction_rate: number;
  added_by: string | null;
  language: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface UseAssetIntelligenceFilters {
  entity?: string;
  assetType?: string;
  policyStatus?: string;
  language?: string;
  search?: string;
}

export function useAssetIntelligence(filters: UseAssetIntelligenceFilters = {}) {
  return useQuery({
    queryKey: ["asset-intelligence", filters],
    queryFn: async () => {
      let query = supabase
        .from("asset_intelligence")
        .select("*")
        .order("interaction_rate", { ascending: false });

      if (filters.entity && filters.entity !== "all") {
        query = query.eq("entity", filters.entity);
      }
      if (filters.assetType && filters.assetType !== "all") {
        query = query.eq("asset_type", filters.assetType);
      }
      if (filters.policyStatus && filters.policyStatus !== "all") {
        query = query.eq("policy_status", filters.policyStatus);
      }
      if (filters.language && filters.language !== "all") {
        query = query.eq("language", filters.language);
      }
      if (filters.search) {
        query = query.ilike("asset_text", `%${filters.search}%`);
      }

      const { data, error } = await query.limit(500);
      if (error) throw error;
      return (data || []) as AssetIntelligenceRow[];
    },
  });
}

export function useAssetPolicyCheck(assetText: string, entity: string) {
  return useQuery({
    queryKey: ["asset-policy-check", assetText, entity],
    queryFn: async () => {
      if (!assetText?.trim() || !entity) return null;

      // Try exact match first
      const { data: exact } = await supabase
        .from("asset_intelligence")
        .select("policy_status, interaction_rate, approved_count, disapproved_count, entity")
        .eq("entity", entity)
        .eq("asset_text", assetText.trim())
        .maybeSingle();

      if (exact) return { ...exact, matchType: "exact" as const };

      // Try partial match
      const { data: partial } = await supabase
        .from("asset_intelligence")
        .select("policy_status, interaction_rate, approved_count, disapproved_count, entity")
        .eq("entity", entity)
        .ilike("asset_text", `%${assetText.trim()}%`)
        .limit(1)
        .maybeSingle();

      if (partial) return { ...partial, matchType: "partial" as const };
      return null;
    },
    enabled: !!assetText?.trim() && assetText.trim().length >= 5 && !!entity,
    staleTime: 60_000,
  });
}

export function useAssetSuggestions(query: string, entity: string, assetType: string) {
  return useQuery({
    queryKey: ["asset-suggestions", query, entity, assetType],
    queryFn: async () => {
      if (!query?.trim() || query.trim().length < 3) return [];

      const { data, error } = await supabase
        .from("asset_intelligence")
        .select("asset_text, policy_status, interaction_rate, best_interaction_rate")
        .eq("entity", entity)
        .eq("asset_type", assetType)
        .eq("policy_status", "approved")
        .ilike("asset_text", `%${query.trim()}%`)
        .order("interaction_rate", { ascending: false })
        .limit(5);

      if (error) throw error;
      return data || [];
    },
    enabled: !!query?.trim() && query.trim().length >= 3 && !!entity,
    staleTime: 30_000,
  });
}

export function useAssetInsights() {
  return useQuery({
    queryKey: ["asset-insights"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("asset_intelligence")
        .select("entity, policy_status, interaction_rate, asset_text, asset_type, total_interactions");

      if (error) throw error;
      const assets = data || [];

      const entities = [...new Set(assets.map(a => a.entity))];
      const byEntity: Record<string, { total: number; approved: number; disapproved: number }> = {};

      for (const e of entities) {
        const entityAssets = assets.filter(a => a.entity === e);
        byEntity[e] = {
          total: entityAssets.length,
          approved: entityAssets.filter(a => a.policy_status === "approved").length,
          disapproved: entityAssets.filter(a => a.policy_status === "disapproved").length,
        };
      }

      const topPerformers = [...assets]
        .filter(a => a.policy_status === "approved")
        .sort((a, b) => (b.interaction_rate || 0) - (a.interaction_rate || 0))
        .slice(0, 5);

      return { byEntity, topPerformers, totalAssets: assets.length, entities };
    },
  });
}
