import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "./use-toast";

export interface CopywriterCopy {
  id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  element_type: string;
  content_en: string | null;
  content_ar: string | null;
  content_az: string | null;
  content_es: string | null;
  platform: string[];
  entity: string[];
  campaigns: string[];
  tags: string[];
  is_synced_to_planner: boolean;
  region: string | null;
  char_limit_en: number | null;
  char_limit_ar: number | null;
  char_limit_az: number | null;
  char_limit_es: number | null;
  status: string;
}

interface CopywriterFilters {
  platform?: string[];
  entity?: string[];
  campaigns?: string[];
  elementType?: string;
  search?: string;
  status?: string;
}

export const useCopywriterCopies = (filters?: CopywriterFilters) => {
  return useQuery({
    queryKey: ["copywriter-copies", filters],
    queryFn: async () => {
      let query = supabase
        .from("copywriter_copies")
        .select("*")
        .order("created_at", { ascending: false });

      if (filters?.platform && filters.platform.length > 0) {
        query = query.overlaps("platform", filters.platform);
      }

      if (filters?.entity && filters.entity.length > 0) {
        query = query.overlaps("entity", filters.entity);
      }

      if (filters?.campaigns && filters.campaigns.length > 0) {
        query = query.overlaps("campaigns", filters.campaigns);
      }

      if (filters?.elementType) {
        query = query.eq("element_type", filters.elementType);
      }

      if (filters?.status) {
        query = query.eq("status", filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Client-side search across all language content
      if (filters?.search && data) {
        const searchLower = filters.search.toLowerCase();
        return data.filter((copy) => {
          const searchableContent = [
            copy.content_en,
            copy.content_ar,
            copy.content_az,
            copy.content_es,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return searchableContent.includes(searchLower);
        });
      }

      return data as CopywriterCopy[];
    },
    staleTime: 60 * 1000,
    placeholderData: (previousData) => previousData,
  });
};

export const useCreateCopywriterCopy = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      copy: Omit<CopywriterCopy, "id" | "created_at" | "updated_at" | "created_by" | "is_synced_to_planner">
    ) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      const { error } = await supabase.from("copywriter_copies").insert({
        ...copy,
        created_by: userData.user.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["copywriter-copies"] });
      toast({
        title: "Copy created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error creating copy",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useUpdateCopywriterCopy = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<CopywriterCopy> }) => {
      const { error } = await supabase
        .from("copywriter_copies")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["copywriter-copies"] });
      toast({
        title: "Copy updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error updating copy",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useDeleteCopywriterCopy = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("copywriter_copies").delete().eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["copywriter-copies"] });
      toast({
        title: "Copy deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting copy",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};
