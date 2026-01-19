import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { LpSection, SectionImage, WebsiteLink } from "./useLpSections";

export interface LpMapSection {
  id: string;
  lp_map_id: string;
  section_id: string;
  position: number;
  overrides: Record<string, unknown>;
  created_at: string;
  section?: LpSection;
}

export interface LpMap {
  id: string;
  name: string;
  description: string | null;
  entity_id: string | null;
  created_by: string;
  status: string;
  is_active: boolean;
  public_token: string;
  is_public: boolean;
  click_count: number;
  last_accessed_at: string | null;
  created_at: string;
  updated_at: string;
  entity?: { id: string; name: string } | null;
  sections?: LpMapSection[];
}

interface LpMapFilters {
  entityId?: string;
  status?: string;
  isActive?: boolean;
}

export const useLpMaps = (filters?: LpMapFilters) => {
  return useQuery({
    queryKey: ["lp-maps", filters],
    queryFn: async () => {
      let query = supabase
        .from("lp_maps")
        .select(`*, entity:system_entities(id, name), sections:lp_map_sections(id)`)
        .order("created_at", { ascending: false });

      if (filters?.entityId) query = query.eq("entity_id", filters.entityId);
      if (filters?.status) query = query.eq("status", filters.status);
      if (filters?.isActive !== undefined) query = query.eq("is_active", filters.isActive);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as LpMap[];
    },
    staleTime: 30 * 1000,
  });
};

export const useLpMapWithSections = (mapId: string | null) => {
  return useQuery({
    queryKey: ["lp-map", mapId],
    queryFn: async () => {
      if (!mapId) return null;

      const { data: map, error: mapError } = await supabase
        .from("lp_maps")
        .select(`*, entity:system_entities(id, name)`)
        .eq("id", mapId)
        .single();

      if (mapError) throw mapError;

      const { data: mapSections, error: sectionsError } = await supabase
        .from("lp_map_sections")
        .select(`*, section:lp_sections(*, entity:system_entities(id, name))`)
        .eq("lp_map_id", mapId)
        .order("position", { ascending: true });

      if (sectionsError) throw sectionsError;

      const transformedSections = (mapSections || []).map(ms => ({
        ...ms,
        section: ms.section ? {
          ...ms.section,
          sample_images: (ms.section.sample_images as unknown as SectionImage[]) || [],
          website_links: (ms.section.website_links as unknown as WebsiteLink[]) || [],
        } : undefined,
      }));

      return { ...map, sections: transformedSections } as LpMap;
    },
    enabled: !!mapId,
    staleTime: 30 * 1000,
  });
};

export const useLpMapByToken = (token: string | null) => {
  return useQuery({
    queryKey: ["lp-map-public", token],
    queryFn: async () => {
      if (!token) return null;

      const { data: map, error: mapError } = await supabase
        .from("lp_maps")
        .select(`*, entity:system_entities(id, name)`)
        .eq("public_token", token)
        .eq("is_public", true)
        .single();

      if (mapError) throw mapError;

      // Fire-and-forget click tracking update (don't await, don't block page load)
      void supabase.from("lp_maps").update({
        click_count: (map.click_count || 0) + 1,
        last_accessed_at: new Date().toISOString(),
      }).eq("id", map.id);

      const { data: mapSections, error: sectionsError } = await supabase
        .from("lp_map_sections")
        .select(`*, section:lp_sections(*)`)
        .eq("lp_map_id", map.id)
        .order("position", { ascending: true });

      if (sectionsError) throw sectionsError;

      const transformedSections = (mapSections || []).map(ms => ({
        ...ms,
        section: ms.section ? {
          ...ms.section,
          sample_images: (ms.section.sample_images as unknown as SectionImage[]) || [],
          website_links: (ms.section.website_links as unknown as WebsiteLink[]) || [],
        } : undefined,
      }));

      return { ...map, sections: transformedSections } as LpMap;
    },
    enabled: !!token,
  });
};

export const useCreateLpMap = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: { name: string; description?: string; entity_id?: string }) => {
      if (!user?.id) throw new Error("Not authenticated");
      const { data: result, error } = await supabase
        .from("lp_maps")
        .insert({ ...data, created_by: user.id })
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lp-maps"] });
      toast.success("Map created successfully");
    },
    onError: () => toast.error("Failed to create map"),
  });
};

export const useUpdateLpMap = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name?: string; description?: string; entity_id?: string | null; status?: string; is_active?: boolean; is_public?: boolean }) => {
      const { data: result, error } = await supabase.from("lp_maps").update(data).eq("id", id).select().single();
      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["lp-maps"] });
      queryClient.invalidateQueries({ queryKey: ["lp-map", variables.id] });
      toast.success("Map updated");
    },
    onError: () => toast.error("Failed to update map"),
  });
};

export const useDeleteLpMap = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lp_maps").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lp-maps"] });
      toast.success("Map deleted");
    },
    onError: () => toast.error("Failed to delete map"),
  });
};

export const useAddSectionToMap = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ mapId, sectionId, position }: { mapId: string; sectionId: string; position: number }) => {
      const { data, error } = await supabase.from("lp_map_sections").insert({ lp_map_id: mapId, section_id: sectionId, position }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => queryClient.invalidateQueries({ queryKey: ["lp-map", variables.mapId] }),
    onError: () => toast.error("Failed to add section"),
  });
};

export const useRemoveSectionFromMap = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ mapSectionId, mapId }: { mapSectionId: string; mapId: string }) => {
      const { error } = await supabase.from("lp_map_sections").delete().eq("id", mapSectionId);
      if (error) throw error;
    },
    onSuccess: (_, variables) => queryClient.invalidateQueries({ queryKey: ["lp-map", variables.mapId] }),
    onError: () => toast.error("Failed to remove section"),
  });
};

export const useReorderMapSections = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ mapId, sectionOrders }: { mapId: string; sectionOrders: { id: string; position: number }[] }) => {
      await Promise.all(sectionOrders.map(({ id, position }) => supabase.from("lp_map_sections").update({ position }).eq("id", id)));
    },
    onSuccess: (_, variables) => queryClient.invalidateQueries({ queryKey: ["lp-map", variables.mapId] }),
    onError: () => toast.error("Failed to reorder sections"),
  });
};
