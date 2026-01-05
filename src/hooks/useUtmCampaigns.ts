import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type UtmCampaignRow = Database["public"]["Tables"]["utm_campaigns"]["Row"];
type UtmCampaignInsert = Database["public"]["Tables"]["utm_campaigns"]["Insert"];

export type UtmCampaign = UtmCampaignRow;

export const useUtmCampaigns = () => {
  return useQuery({
    queryKey: ["utm-campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("utm_campaigns")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: false })
        .order("last_used_at", { ascending: false, nullsFirst: false })
        .order("usage_count", { ascending: false })
        .order("name");

      if (error) throw error;
      return data as UtmCampaign[];
    },
  });
};

export const useUpdateCampaignOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (campaigns: Array<{ id: string; display_order: number }>) => {
      const promises = campaigns.map(({ id, display_order }) =>
        supabase
          .from("utm_campaigns")
          .update({ display_order })
          .eq("id", id)
      );
      
      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["utm-campaigns"] });
      toast.success("Campaign order updated");
    },
    onError: (error: Error) => {
      toast.error("Failed to update order: " + error.message);
    },
  });
};

export const useCreateUtmCampaign = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, landingPage }: { name: string; landingPage?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("utm_campaigns")
        .insert({
          name,
          landing_page: landingPage || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["utm-campaigns"] });
      toast.success("Campaign created successfully");
    },
    onError: (error) => {
      toast.error("Failed to create campaign: " + error.message);
    },
  });
};

export const useUpdateUtmCampaign = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, name, landing_page }: { id: string; name?: string; landing_page?: string | null }) => {
      const { data, error } = await supabase
        .from("utm_campaigns")
        .update({ name, landing_page })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["utm-campaigns"] });
      toast.success("Campaign updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update campaign: " + error.message);
    },
  });
};

export const useDeleteUtmCampaign = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("utm_campaigns")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["utm-campaigns"] });
      toast.success("Campaign deleted successfully");
    },
    onError: (error) => {
      toast.error("Failed to delete campaign: " + error.message);
    },
  });
};

export const useUpsertUtmCampaigns = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (campaigns: Array<{
      name: string;
      landing_page?: string;
      campaign_type?: string;
      description?: string;
    }>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Fetch existing campaigns to check for matches
      const { data: existingCampaigns } = await supabase
        .from("utm_campaigns")
        .select("id, name");

      const existingMap = new Map(
        existingCampaigns?.map(c => [c.name.toLowerCase(), c.id]) || []
      );

      let created = 0;
      let updated = 0;

      for (const campaign of campaigns) {
        const existingId = existingMap.get(campaign.name.toLowerCase());
        
        if (existingId) {
          // Update existing
          const { error } = await supabase
            .from("utm_campaigns")
            .update({
              landing_page: campaign.landing_page || null,
              campaign_type: campaign.campaign_type || null,
              description: campaign.description || null,
            })
            .eq("id", existingId);
          
          if (error) throw error;
          updated++;
        } else {
          // Insert new
          const { error } = await supabase
            .from("utm_campaigns")
            .insert({
              name: campaign.name,
              landing_page: campaign.landing_page || null,
              campaign_type: campaign.campaign_type || null,
              description: campaign.description || null,
              created_by: user.id,
            });
          
          if (error) throw error;
          created++;
        }
      }

      return { created, updated };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["utm-campaigns"] });
      toast.success(`Import complete: ${result.created} created, ${result.updated} updated`);
    },
    onError: (error: Error) => {
      toast.error("Failed to import campaigns: " + error.message);
    },
  });
};
