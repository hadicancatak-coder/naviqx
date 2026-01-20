import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CMSPage {
  id: string;
  slug: string;
  title: string;
  content: string;
  version: string | null;
  updated_at: string;
  updated_by: string | null;
}

export const useCmsPage = (slug: string) => {
  return useQuery({
    queryKey: ["cms-page", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cms_pages")
        .select("*")
        .eq("slug", slug)
        .single();
      
      if (error) throw error;
      return data as CMSPage;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - CMS content rarely changes
    enabled: !!slug,
  });
};

export const useUpdateCmsPage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      content,
      version,
    }: {
      id: string;
      content: string;
      version?: string;
    }) => {
      const updateData: Record<string, unknown> = {
        content,
        updated_at: new Date().toISOString(),
      };
      
      if (version !== undefined) {
        updateData.version = version;
      }

      const { data, error } = await supabase
        .from("cms_pages")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["cms-page", data.slug] });
      toast.success("Page updated");
    },
    onError: () => {
      toast.error("Failed to save changes");
    },
  });
};
