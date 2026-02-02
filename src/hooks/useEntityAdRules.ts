import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

export interface EntityAdRules {
  id: string;
  entity: string;
  prohibited_words: string[];
  competitor_names: string[];
  custom_validation_rules: Json[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useEntityAdRules = (entity?: string) => {
  const queryClient = useQueryClient();

  // Fetch rules for a specific entity (or global)
  const { data: rules, isLoading } = useQuery({
    queryKey: ["entity_ad_rules", entity],
    queryFn: async () => {
      if (!entity) return null;

      // Try to fetch entity-specific rules
      const { data: entityRules, error: entityError } = await supabase
        .from("entity_ad_rules")
        .select("*")
        .eq("entity", entity)
        .eq("is_active", true)
        .maybeSingle();

      // Also fetch global rules as fallback
      const { data: globalRules, error: globalError } = await supabase
        .from("entity_ad_rules")
        .select("*")
        .eq("entity", "GLOBAL")
        .eq("is_active", true)
        .maybeSingle();

      if (entityError && entityError.code !== 'PGRST116') throw entityError;
      if (globalError && globalError.code !== 'PGRST116') throw globalError;

      // Merge entity rules with global rules (entity takes priority)
      const merged: EntityAdRules = {
        id: entityRules?.id || globalRules?.id || "",
        entity: entity,
        prohibited_words: [
          ...(Array.isArray(globalRules?.prohibited_words) ? globalRules.prohibited_words : []),
          ...(Array.isArray(entityRules?.prohibited_words) ? entityRules.prohibited_words : []),
        ],
        competitor_names: [
          ...(Array.isArray(globalRules?.competitor_names) ? globalRules.competitor_names : []),
          ...(Array.isArray(entityRules?.competitor_names) ? entityRules.competitor_names : []),
        ],
        custom_validation_rules: [
          ...(Array.isArray(globalRules?.custom_validation_rules) ? globalRules.custom_validation_rules : []),
          ...(Array.isArray(entityRules?.custom_validation_rules) ? entityRules.custom_validation_rules : []),
        ],
        is_active: true,
        created_at: entityRules?.created_at || globalRules?.created_at || new Date().toISOString(),
        updated_at: entityRules?.updated_at || globalRules?.updated_at || new Date().toISOString(),
      };

      return merged;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    enabled: !!entity,
  });

  // Fetch all rules (for admin)
  const { data: allRules } = useQuery({
    queryKey: ["entity_ad_rules_all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("entity_ad_rules")
        .select("*")
        .order("entity");

      if (error) throw error;
      return data as EntityAdRules[];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Update rules
  const updateRules = useMutation({
    mutationFn: async (updates: {
      entity: string;
      prohibited_words?: string[];
      competitor_names?: string[];
      custom_validation_rules?: Json[];
    }) => {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("entity_ad_rules")
        .upsert([{
          entity: updates.entity,
          prohibited_words: updates.prohibited_words,
          competitor_names: updates.competitor_names,
          custom_validation_rules: updates.custom_validation_rules as Json,
          updated_by: user?.id,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entity_ad_rules"] });
      queryClient.invalidateQueries({ queryKey: ["entity_ad_rules_all"] });
      toast.success("Ad rules updated successfully");
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Failed to update rules");
    },
  });

  return {
    rules,
    allRules,
    isLoading,
    updateRules,
  };
};
