import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { logger } from "@/lib/logger";

interface LpOrderPreference {
  id: string;
  user_id: string;
  entity_id: string | null;
  lp_order: string[];
  created_at: string;
  updated_at: string;
}

export const useLpOrderPreferences = (entityId: string | null) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["lp-order-preferences", entityId, user?.id],
    queryFn: async () => {
      if (!user?.id || !entityId) return null;

      const { data, error } = await supabase
        .from("user_lp_order_preferences")
        .select("*")
        .eq("user_id", user.id)
        .eq("entity_id", entityId)
        .maybeSingle();

      if (error) {
        logger.error("Error fetching LP order preferences:", error);
        return null;
      }

      return data as LpOrderPreference | null;
    },
    enabled: !!user?.id && !!entityId,
    staleTime: 60 * 1000, // 1 minute
    placeholderData: (previousData) => previousData,
  });
};

export const useSaveLpOrderPreferences = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      entityId,
      lpOrder,
    }: {
      entityId: string;
      lpOrder: string[];
    }) => {
      if (!user?.id) throw new Error("Not authenticated");

      // Upsert the preference
      const { data, error } = await supabase
        .from("user_lp_order_preferences")
        .upsert(
          {
            user_id: user.id,
            entity_id: entityId,
            lp_order: lpOrder,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id,entity_id",
          }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["lp-order-preferences", variables.entityId],
      });
    },
  });
};
