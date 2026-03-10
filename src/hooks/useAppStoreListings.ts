import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { AppStoreListing, StoreType, Locale } from "@/domain/app-store";
import { toast } from "sonner";

const QUERY_KEY = ["app-store-listings"];

const asStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
};

const VALID_STATUSES = ["draft", "ready_for_review", "approved", "needs_changes", "live"] as const;
type ListingStatus = (typeof VALID_STATUSES)[number];

const normalizeStatus = (val: unknown): ListingStatus => {
  if (typeof val === "string" && VALID_STATUSES.includes(val as ListingStatus)) return val as ListingStatus;
  return "draft";
};

const normalizeListing = (row: Record<string, unknown>): AppStoreListing => ({
  ...(row as unknown as AppStoreListing),
  store_type: row.store_type === "google_play" ? "google_play" : "apple",
  page_type: row.page_type === "cpp" ? "cpp" : "product_page",
  locale: row.locale === "ar" ? "ar" : "en",
  status: normalizeStatus(row.status),
  version: typeof row.version === "number" ? row.version : 1,
  tags: asStringArray(row.tags),
  screenshot_notes: asStringArray(row.screenshot_notes),
  entities: asStringArray(row.entities),
});

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error && "message" in error) {
    return String((error as { message?: unknown }).message ?? "Unexpected error");
  }
  return "Unexpected error";
};

export function useAppStoreListings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const listingsQuery = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_store_listings")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row) => normalizeListing(row as Record<string, unknown>));
    },
    enabled: !!user,
  });

  const createListing = useMutation({
    mutationFn: async (input: { name: string; store_type: StoreType; locale: Locale; page_type?: string }) => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      const currentUser = authUser ?? user;
      if (!currentUser) throw new Error("You must be logged in to create listings");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from("app_store_listings") as any)
        .insert({
          ...input,
          created_by: currentUser.id,
          tags: [],
          screenshot_notes: [],
          entities: [],
        })
        .select()
        .single();

      if (error) throw error;
      return normalizeListing(data as Record<string, unknown>);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("Listing created");
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });

  const updateListing = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AppStoreListing> & { id: string }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from("app_store_listings") as any)
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return normalizeListing(data as Record<string, unknown>);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });

  const deleteListing = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("app_store_listings")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("Listing deleted");
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });

  const duplicateListing = useMutation({
    mutationFn: async (source: AppStoreListing) => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      const currentUser = authUser ?? user;
      if (!currentUser) throw new Error("You must be logged in");

      const { id, created_at, updated_at, created_by, version, approved_by, approved_at, review_notes, ...fields } = source;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from("app_store_listings") as any)
        .insert({
          ...fields,
          name: `${source.name} (Copy)`,
          status: "draft",
          created_by: currentUser.id,
        })
        .select()
        .single();

      if (error) throw error;
      return normalizeListing(data as Record<string, unknown>);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("Listing duplicated");
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });

  return {
    listings: listingsQuery.data ?? [],
    isLoading: listingsQuery.isLoading,
    createListing,
    updateListing,
    deleteListing,
    duplicateListing,
  };
}
