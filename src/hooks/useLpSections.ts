import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

export interface SectionImage {
  id: string;
  url: string;
  caption?: string;
  order: number;
}

export interface WebsiteLink {
  id: string;
  url: string;
  label: string;
}

export interface LpSection {
  id: string;
  name: string;
  description: string | null;
  brief_content: string | null;
  section_type: string;
  sample_images: SectionImage[];
  website_links: WebsiteLink[];
  entity_id: string | null;
  created_by: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  entity?: {
    id: string;
    name: string;
  } | null;
}

interface LpSectionFilters {
  entityId?: string;
  sectionType?: string;
  isActive?: boolean;
}

export const useLpSections = (filters?: LpSectionFilters) => {
  return useQuery({
    queryKey: ["lp-sections", filters],
    queryFn: async () => {
      let query = supabase
        .from("lp_sections")
        .select(`
          *,
          entity:system_entities(id, name)
        `)
        .order("display_order", { ascending: true });

      if (filters?.entityId) {
        query = query.eq("entity_id", filters.entityId);
      }
      if (filters?.sectionType) {
        query = query.eq("section_type", filters.sectionType);
      }
      if (filters?.isActive !== undefined) {
        query = query.eq("is_active", filters.isActive);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching LP sections:", error);
        throw error;
      }

      return (data || []).map(section => ({
        ...section,
        sample_images: (section.sample_images as unknown as SectionImage[]) || [],
        website_links: (section.website_links as unknown as WebsiteLink[]) || [],
      })) as LpSection[];
    },
    staleTime: 30 * 1000,
    placeholderData: (previousData) => previousData,
  });
};

export const useCreateLpSection = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      description?: string;
      brief_content?: string;
      section_type: string;
      sample_images?: SectionImage[];
      website_links?: WebsiteLink[];
      entity_id?: string;
    }) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { data: result, error } = await supabase
        .from("lp_sections")
        .insert({
          name: data.name,
          description: data.description,
          brief_content: data.brief_content,
          section_type: data.section_type,
          entity_id: data.entity_id,
          created_by: user.id,
          sample_images: (data.sample_images || []) as unknown as Json,
          website_links: (data.website_links || []) as unknown as Json,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lp-sections"] });
      toast.success("Section created successfully");
    },
    onError: (error) => {
      console.error("Error creating section:", error);
      toast.error("Failed to create section");
    },
  });
};

export const useUpdateLpSection = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string;
      name?: string;
      description?: string;
      brief_content?: string;
      section_type?: string;
      sample_images?: SectionImage[];
      website_links?: WebsiteLink[];
      entity_id?: string | null;
      display_order?: number;
      is_active?: boolean;
    }) => {
      const updateData: Record<string, unknown> = { ...data };
      if (data.sample_images) {
        updateData.sample_images = data.sample_images as unknown as Json;
      }
      if (data.website_links) {
        updateData.website_links = data.website_links as unknown as Json;
      }

      const { data: result, error } = await supabase
        .from("lp_sections")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lp-sections"] });
      toast.success("Section updated successfully");
    },
    onError: (error) => {
      console.error("Error updating section:", error);
      toast.error("Failed to update section");
    },
  });
};

export const useDeleteLpSection = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("lp_sections")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lp-sections"] });
      toast.success("Section deleted successfully");
    },
    onError: (error) => {
      console.error("Error deleting section:", error);
      toast.error("Failed to delete section");
    },
  });
};

export const useUploadSectionImage = () => {
  return useMutation({
    mutationFn: async ({ sectionId, file }: { sectionId: string; file: File }) => {
      const fileExt = file.name.split(".").pop();
      const fileName = `${sectionId}/${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("lp-section-images")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("lp-section-images")
        .getPublicUrl(fileName);

      return publicUrl;
    },
    onError: (error) => {
      console.error("Error uploading image:", error);
      toast.error("Failed to upload image");
    },
  });
};

export const useDeleteSectionImage = () => {
  return useMutation({
    mutationFn: async (imageUrl: string) => {
      const url = new URL(imageUrl);
      const pathParts = url.pathname.split("/lp-section-images/");
      if (pathParts.length < 2) throw new Error("Invalid image URL");

      const filePath = pathParts[1];
      const { error } = await supabase.storage
        .from("lp-section-images")
        .remove([filePath]);

      if (error) throw error;
    },
    onError: (error) => {
      console.error("Error deleting image:", error);
      toast.error("Failed to delete image");
    },
  });
};
