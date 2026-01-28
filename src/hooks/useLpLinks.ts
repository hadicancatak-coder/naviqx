import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

export interface LpLink {
  id: string;
  entity_id: string | null;
  name: string | null;
  base_url: string;
  purpose: 'AO' | 'Webinar' | 'Seminar' | null;
  lp_type: 'static' | 'dynamic' | null;
  language: string | null;
  is_active: boolean | null;
  display_order: number | null;
  created_at: string | null;
  created_by: string;
  // Joined entity data
  entity?: {
    id: string;
    name: string;
    code: string;
    website_param: string | null;
  } | null;
}

export interface LpLinkFilters {
  entityId?: string;
  purpose?: 'AO' | 'Webinar' | 'Seminar';
  isActive?: boolean;
}

export const useLpLinks = (filters?: LpLinkFilters) => {
  return useQuery({
    queryKey: ["lp-links", filters],
    queryFn: async () => {
      let query = supabase
        .from("landing_page_templates")
        .select(`
          *,
          entity:system_entities(id, name, code, website_param)
        `)
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: false });

      if (filters?.entityId) {
        query = query.eq("entity_id", filters.entityId);
      }

      if (filters?.purpose) {
        query = query.eq("purpose", filters.purpose);
      }

      if (filters?.isActive !== undefined) {
        query = query.eq("is_active", filters.isActive);
      }

      const { data, error } = await query;

      if (error) {
        logger.error("Error fetching LP links:", error);
        throw error;
      }

      return data as LpLink[];
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData,
  });
};

export const useCreateLpLink = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (lpLink: {
      entity_id?: string | null;
      name: string;
      base_url: string;
      purpose: 'AO' | 'Webinar' | 'Seminar';
      lp_type?: 'static' | 'dynamic';
      language?: string | null;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("landing_page_templates")
        .insert({
          ...lpLink,
          created_by: userData.user.id,
          is_active: true,
          display_order: 0,
        })
        .select(`
          *,
          entity:system_entities(id, name, code, website_param)
        `)
        .single();

      if (error) throw error;
      return data as LpLink;
    },
    onMutate: async () => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["lp-links"] });
    },
    onSuccess: (data) => {
      // Optimistically add to all relevant caches
      const updateCache = (old: LpLink[] | undefined) => {
        if (!old) return [data];
        return [data, ...old];
      };
      queryClient.setQueryData(["lp-links", { isActive: true }], updateCache);
      toast.success("LP Link created successfully");
    },
    onError: (error: Error) => {
      logger.error("Error creating LP link:", error);
      toast.error("Failed to create LP Link: " + error.message);
    },
    onSettled: () => {
      // Background refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ["lp-links"] });
    },
  });
};

export const useUpdateLpLink = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<LpLink> & { id: string }) => {
      const { data, error } = await supabase
        .from("landing_page_templates")
        .update(updates)
        .eq("id", id)
        .select(`
          *,
          entity:system_entities(id, name, code, website_param)
        `)
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async ({ id, ...updates }) => {
      await queryClient.cancelQueries({ queryKey: ["lp-links"] });
      const previousLinks = queryClient.getQueryData(["lp-links"]);
      // Optimistically update
      queryClient.setQueryData(["lp-links", { isActive: true }], (old: LpLink[] | undefined) => {
        if (!old) return old;
        return old.map(link => link.id === id ? { ...link, ...updates } : link);
      });
      return { previousLinks };
    },
    onSuccess: () => {
      toast.success("LP Link updated successfully");
    },
    onError: (error: Error, _, context) => {
      if (context?.previousLinks) {
        queryClient.setQueryData(["lp-links"], context.previousLinks);
      }
      logger.error("Error updating LP link:", error);
      toast.error("Failed to update LP Link: " + error.message);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["lp-links"] });
    },
  });
};

export const useDeleteLpLink = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("landing_page_templates")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return id;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["lp-links"] });
      const previousLinks = queryClient.getQueryData(["lp-links"]);
      // Optimistically remove from cache
      queryClient.setQueryData(["lp-links", { isActive: true }], (old: LpLink[] | undefined) => {
        if (!old) return old;
        return old.filter(link => link.id !== id);
      });
      return { previousLinks };
    },
    onSuccess: () => {
      toast.success("LP Link deleted successfully");
    },
    onError: (error: Error, _, context) => {
      if (context?.previousLinks) {
        queryClient.setQueryData(["lp-links"], context.previousLinks);
      }
      logger.error("Error deleting LP link:", error);
      toast.error("Failed to delete LP Link: " + error.message);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["lp-links"] });
    },
  });
};
