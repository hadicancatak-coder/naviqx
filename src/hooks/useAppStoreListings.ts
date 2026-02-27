import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { AppStoreListing, StoreType, Locale } from "@/domain/app-store";
import { toast } from "sonner";

const QUERY_KEY = ["app-store-listings"];

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
      return (data ?? []) as unknown as AppStoreListing[];
    },
    enabled: !!user,
  });

  const createListing = useMutation({
    mutationFn: async (input: { name: string; store_type: StoreType; locale: Locale }) => {
      const { data, error } = await supabase
        .from("app_store_listings")
        .insert({ ...input, created_by: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as AppStoreListing;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("Listing created");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateListing = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AppStoreListing> & { id: string }) => {
      const { data, error } = await supabase
        .from("app_store_listings")
        .update(updates as Record<string, unknown>)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as AppStoreListing;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
    onError: (e: Error) => toast.error(e.message),
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
    onError: (e: Error) => toast.error(e.message),
  });

  return { listings: listingsQuery.data ?? [], isLoading: listingsQuery.isLoading, createListing, updateListing, deleteListing };
}
