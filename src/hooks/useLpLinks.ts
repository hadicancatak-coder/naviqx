import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
          entity:system_entities(id, name, code)
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
        console.error("Error fetching LP links:", error);
        throw error;
      }

      return data as LpLink[];
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
};

export const useCreateLpLink = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (lpLink: {
      entity_id: string | null;
      name: string;
      base_url: string;
      purpose: 'AO' | 'Webinar' | 'Seminar';
      lp_type: 'static' | 'dynamic';
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
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lp-links"] });
      toast.success("LP Link created successfully");
    },
    onError: (error: Error) => {
      console.error("Error creating LP link:", error);
      toast.error("Failed to create LP Link: " + error.message);
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
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lp-links"] });
      toast.success("LP Link updated successfully");
    },
    onError: (error: Error) => {
      console.error("Error updating LP link:", error);
      toast.error("Failed to update LP Link: " + error.message);
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lp-links"] });
      toast.success("LP Link deleted successfully");
    },
    onError: (error: Error) => {
      console.error("Error deleting LP link:", error);
      toast.error("Failed to delete LP Link: " + error.message);
    },
  });
};
