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
    staleTime: 30 * 1000, // 30 seconds cache
    placeholderData: (previousData) => previousData,
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
      asset_link?: string;
      version_number?: number;
      version_notes?: string;
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
      let versionsCreated = 0;

      for (const campaign of campaigns) {
        const existingId = existingMap.get(campaign.name.toLowerCase());
        let campaignId: string;
        
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
          campaignId = existingId;
          updated++;
        } else {
          // Insert new
          const { data, error } = await supabase
            .from("utm_campaigns")
            .insert({
              name: campaign.name,
              landing_page: campaign.landing_page || null,
              campaign_type: campaign.campaign_type || null,
              description: campaign.description || null,
              created_by: user.id,
            })
            .select("id")
            .single();
          
          if (error) throw error;
          campaignId = data.id;
          created++;
        }

        // Create version if version data is provided
        const hasVersionData = !!(campaign.asset_link || campaign.version_number || campaign.version_notes);
        if (hasVersionData && campaignId) {
          // Get next version number if not provided
          let versionNumber = campaign.version_number;
          if (!versionNumber) {
            const { data: latestVersion } = await supabase
              .from("utm_campaign_versions")
              .select("version_number")
              .eq("utm_campaign_id", campaignId)
              .order("version_number", { ascending: false })
              .limit(1)
              .single();
            
            versionNumber = (latestVersion?.version_number || 0) + 1;
          }

          // Check if version number already exists
          const { data: existingVersion } = await supabase
            .from("utm_campaign_versions")
            .select("id")
            .eq("utm_campaign_id", campaignId)
            .eq("version_number", versionNumber)
            .maybeSingle();

          if (!existingVersion) {
            const { error: versionError } = await supabase
              .from("utm_campaign_versions")
              .insert({
                utm_campaign_id: campaignId,
                version_number: versionNumber,
                name: campaign.name,
                landing_page: campaign.landing_page || null,
                description: campaign.description || null,
                asset_link: campaign.asset_link || null,
                version_notes: campaign.version_notes || null,
                created_by: user.id,
              });

            if (versionError) {
              console.warn(`Failed to create version for campaign ${campaign.name}:`, versionError);
            } else {
              versionsCreated++;
            }
          }
        }
      }

      return { created, updated, versionsCreated };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["utm-campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["campaign-versions"] });
      const parts = [];
      if (result.created > 0) parts.push(`${result.created} created`);
      if (result.updated > 0) parts.push(`${result.updated} updated`);
      if (result.versionsCreated > 0) parts.push(`${result.versionsCreated} versions added`);
      toast.success(`Import complete: ${parts.join(", ")}`);
    },
    onError: (error: Error) => {
      toast.error("Failed to import campaigns: " + error.message);
    },
  });
};
