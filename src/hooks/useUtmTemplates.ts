import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type UtmTemplateRow = Database["public"]["Tables"]["utm_templates"]["Row"];
type UtmTemplateInsert = Database["public"]["Tables"]["utm_templates"]["Insert"];

export type UtmTemplate = UtmTemplateRow;

export const useUtmTemplates = () => {
  return useQuery({
    queryKey: ["utm-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("utm_templates")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as UtmTemplate[];
    },
    staleTime: 60 * 1000, // 1 minute
    placeholderData: (previousData) => previousData,
  });
};

export const useCreateUtmTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (template: Omit<UtmTemplateInsert, "created_by" | "created_at" | "updated_at" | "id">) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("utm_templates")
        .insert({
          ...template,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["utm-templates"] });
      toast.success("Template created successfully");
    },
    onError: (error) => {
      toast.error("Failed to create template: " + error.message);
    },
  });
};

export const useDeleteUtmTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("utm_templates")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["utm-templates"] });
      toast.success("Template deleted successfully");
    },
    onError: (error) => {
      toast.error("Failed to delete template: " + error.message);
    },
  });
};
