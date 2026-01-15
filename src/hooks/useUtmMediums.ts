import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface UtmMedium {
  id: string;
  name: string;
  display_order: number;
  created_at: string;
}

// Fetch all UTM mediums
export const useUtmMediums = () => {
  return useQuery({
    queryKey: ["utm-mediums"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("utm_mediums")
        .select("*")
        .order("display_order");

      if (error) throw error;
      return data as UtmMedium[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - medium data rarely changes
  });
};

// Create UTM medium
export const useCreateMedium = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (medium: { name: string; display_order: number }) => {
      const { data, error } = await supabase
        .from("utm_mediums")
        .insert(medium)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["utm-mediums"] });
      toast.success("UTM medium created successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create UTM medium");
    },
  });
};

// Update UTM medium
export const useUpdateMedium = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: {
      id: string;
      name?: string;
      display_order?: number;
    }) => {
      const { data, error } = await supabase
        .from("utm_mediums")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["utm-mediums"] });
      toast.success("UTM medium updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update UTM medium");
    },
  });
};

// Delete UTM medium
export const useDeleteMedium = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("utm_mediums").delete().eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["utm-mediums"] });
      toast.success("UTM medium deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete UTM medium");
    },
  });
};

// Update medium order (for drag-and-drop)
export const useUpdateMediumOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (mediums: Array<{ id: string; display_order: number }>) => {
      const promises = mediums.map(({ id, display_order }) =>
        supabase
          .from("utm_mediums")
          .update({ display_order })
          .eq("id", id)
      );
      
      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["utm-mediums"] });
      toast.success("Medium order updated");
    },
    onError: (error: Error) => {
      toast.error("Failed to update order: " + error.message);
    },
  });
};
