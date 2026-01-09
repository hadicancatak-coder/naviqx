import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type UtmPlatformRow = Database["public"]["Tables"]["utm_platforms"]["Row"];
type UtmPlatformInsert = Database["public"]["Tables"]["utm_platforms"]["Insert"];
type UtmPlatformUpdate = Database["public"]["Tables"]["utm_platforms"]["Update"];

export type UtmPlatform = UtmPlatformRow;

export const useUtmPlatforms = () => {
  return useQuery({
    queryKey: ["utm-platforms"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("utm_platforms")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data as UtmPlatform[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - platform data rarely changes
  });
};

export const useCreatePlatform = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (platform: Omit<UtmPlatformInsert, "id" | "created_at">) => {
      const { data, error } = await supabase
        .from("utm_platforms")
        .insert(platform)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["utm-platforms"] });
      toast.success("Platform created successfully");
    },
    onError: (error) => {
      toast.error(`Failed to create platform: ${error.message}`);
    },
  });
};

export const useUpdatePlatform = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<UtmPlatformUpdate>) => {
      const { data, error } = await supabase
        .from("utm_platforms")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["utm-platforms"] });
      toast.success("Platform updated successfully");
    },
    onError: (error) => {
      toast.error(`Failed to update platform: ${error.message}`);
    },
  });
};

export const useDeletePlatform = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("utm_platforms")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["utm-platforms"] });
      toast.success("Platform deleted successfully");
    },
    onError: (error) => {
      toast.error(`Failed to delete platform: ${error.message}`);
    },
  });
};
