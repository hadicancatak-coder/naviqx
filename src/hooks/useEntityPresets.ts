import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface EntityPreset {
  id: string;
  user_id: string;
  name: string;
  entities: string[];
  created_at: string;
  updated_at: string;
}

export const useEntityPresets = () => {
  return useQuery({
    queryKey: ["entity-presets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("entity_presets")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as EntityPreset[];
    },
    staleTime: 60 * 1000,
    placeholderData: (previousData) => previousData,
  });
};

export const useCreateEntityPreset = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (preset: { name: string; entities: string[] }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from("entity_presets")
        .insert([{
          ...preset,
          user_id: user.id
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entity-presets"] });
      toast.success("Preset saved successfully!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to save preset: ${error.message}`);
    },
  });
};

export const useDeleteEntityPreset = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("entity_presets")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entity-presets"] });
      toast.success("Preset deleted");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete preset: ${error.message}`);
    },
  });
};
