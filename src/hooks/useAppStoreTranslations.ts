import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { AppStoreTranslation, ListingStatus } from "@/domain/app-store";
import { toast } from "sonner";

const QUERY_KEY = "app-store-translations";

const VALID_STATUSES = ["draft", "ready_for_review", "approved", "needs_changes", "live"] as const;

const normalizeStatus = (val: unknown): ListingStatus => {
  if (typeof val === "string" && VALID_STATUSES.includes(val as ListingStatus)) return val as ListingStatus;
  return "draft";
};

const normalize = (row: Record<string, unknown>): AppStoreTranslation => ({
  ...(row as AppStoreTranslation),
  status: normalizeStatus(row.status),
});

export function useAppStoreTranslations(listingId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const queryKey = [QUERY_KEY, listingId];

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      if (!listingId) return [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from("app_store_translations") as any)
        .select("*")
        .eq("listing_id", listingId)
        .order("locale");
      if (error) throw error;
      return (data ?? []).map((r: Record<string, unknown>) => normalize(r));
    },
    enabled: !!listingId && !!user,
  });

  const upsertTranslation = useMutation({
    mutationFn: async (input: { listing_id: string; locale: string } & Partial<AppStoreTranslation>) => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const currentUser = authUser ?? user;
      if (!currentUser) throw new Error("You must be logged in");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from("app_store_translations") as any)
        .upsert(
          { ...input, created_by: currentUser.id },
          { onConflict: "listing_id,locale" }
        )
        .select()
        .single();
      if (error) throw error;
      return normalize(data as Record<string, unknown>);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Failed to save translation"),
  });

  const deleteTranslation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("app_store_translations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("Translation deleted");
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Failed to delete"),
  });

  return {
    translations: query.data ?? [],
    isLoading: query.isLoading,
    upsertTranslation,
    deleteTranslation,
  };
}
