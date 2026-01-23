import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type UtmLinkRow = Database["public"]["Tables"]["utm_links"]["Row"];
type UtmLinkInsert = Database["public"]["Tables"]["utm_links"]["Insert"];
type UtmLinkUpdate = Database["public"]["Tables"]["utm_links"]["Update"];

export type UtmLinkCreator = {
  name: string | null;
  avatar_url: string | null;
};

export type UtmLink = UtmLinkRow & {
  creator?: UtmLinkCreator | null;
};

export interface UtmLinkFilters {
  entity?: string[];
  teams?: string[];
  campaign_name?: string[];
  platform?: string[];
  link_purpose?: string[];
  lp_type?: string;
  status?: string;
  created_by?: string;
  search?: string;
  expansion_group_id?: string;
}

export const useUtmLinks = (filters?: UtmLinkFilters) => {
  return useQuery({
    queryKey: ["utm-links", filters],
    queryFn: async () => {
      let query = supabase
        .from("utm_links")
        .select("*")
        .order("created_at", { ascending: false });

      if (filters?.entity && filters.entity.length > 0) {
        query = query.overlaps("entity", filters.entity);
      }
      if (filters?.teams && filters.teams.length > 0) {
        query = query.overlaps("teams", filters.teams);
      }
      if (filters?.campaign_name && filters.campaign_name.length > 0) {
        query = query.in("campaign_name", filters.campaign_name);
      }
      if (filters?.platform && filters.platform.length > 0) {
        query = query.in("platform", filters.platform);
      }
      if (filters?.link_purpose && filters.link_purpose.length > 0) {
        query = query.in("link_purpose", filters.link_purpose);
      }
      if (filters?.lp_type) {
        query = query.eq("lp_type", filters.lp_type);
      }
      if (filters?.status) {
        query = query.eq("status", filters.status as any);
      }
      if (filters?.created_by) {
        query = query.eq("created_by", filters.created_by);
      }
      if (filters?.search) {
        query = query.or(
          `name.ilike.%${filters.search}%,full_url.ilike.%${filters.search}%,utm_campaign.ilike.%${filters.search}%,campaign_name.ilike.%${filters.search}%`
        );
      }
      if (filters?.expansion_group_id) {
        query = query.eq("expansion_group_id", filters.expansion_group_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Fetch creator profiles separately
      const creatorIds = [...new Set(data?.map(link => link.created_by).filter(Boolean))];
      let profilesMap: Record<string, UtmLinkCreator> = {};
      
      if (creatorIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, name, avatar_url")
          .in("user_id", creatorIds);
        
        if (profiles) {
          profilesMap = profiles.reduce((acc, p) => {
            acc[p.user_id] = { name: p.name, avatar_url: p.avatar_url };
            return acc;
          }, {} as Record<string, UtmLinkCreator>);
        }
      }
      
      // Merge creator data with links
      return (data || []).map(link => ({
        ...link,
        creator: link.created_by ? profilesMap[link.created_by] || null : null,
      })) as UtmLink[];
    },
    staleTime: 30 * 1000, // 30 seconds - prevents excessive refetches
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData,
  });
};

export const useCreateUtmLink = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (utmLink: Omit<UtmLinkInsert, "created_by" | "created_at" | "updated_at" | "id">) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("utm_links")
        .insert({
          ...utmLink,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["utm-links"] });
    },
    onSuccess: () => {
      toast.success("UTM link created successfully");
    },
    onError: (error) => {
      toast.error("Failed to create UTM link: " + error.message);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["utm-links"] });
    },
  });
};

export const useUpdateUtmLink = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: UtmLinkUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("utm_links")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["utm-links"] });
    },
    onSuccess: () => {
      toast.success("UTM link updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update UTM link: " + error.message);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["utm-links"] });
    },
  });
};

export const useDeleteUtmLink = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("utm_links")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return id;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["utm-links"] });
    },
    onSuccess: () => {
      toast.success("UTM link deleted successfully");
    },
    onError: (error) => {
      toast.error("Failed to delete UTM link: " + error.message);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["utm-links"] });
    },
  });
};

export const useValidateUtmLink = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("utm_links")
        .update({
          is_validated: true,
          validated_by: user.id,
          validated_at: new Date().toISOString(),
          validation_notes: notes,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["utm-links"] });
      toast.success("UTM link validated successfully");
    },
    onError: (error) => {
      toast.error("Failed to validate UTM link: " + error.message);
    },
  });
};

export const useBulkCreateUtmLinks = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (links: Array<Omit<UtmLinkInsert, "created_by" | "created_at" | "updated_at" | "id">>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const linksWithUser = links.map(link => ({
        ...link,
        created_by: user.id,
      }));

      const { data, error } = await supabase
        .from("utm_links")
        .insert(linksWithUser)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["utm-links"] });
      toast.success(`Created ${data.length} UTM links successfully`);
    },
    onError: (error) => {
      toast.error("Failed to create bulk UTM links: " + error.message);
    },
  });
};
