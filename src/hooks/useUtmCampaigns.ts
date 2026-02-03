import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";
import { logger } from "@/lib/logger";

type UtmCampaignRow = Database["public"]["Tables"]["utm_campaigns"]["Row"];
type UtmCampaignInsert = Database["public"]["Tables"]["utm_campaigns"]["Insert"];
type TrackingRow = Database["public"]["Tables"]["campaign_entity_tracking"]["Row"];

export interface UtmCampaignWithTracking extends UtmCampaignRow {
  tracking?: TrackingRow[];
}

export type UtmCampaign = UtmCampaignRow;

/**
 * Fetches UTM campaigns with optional pre-joined tracking records
 * Using joined query eliminates O(n) filtering in components
 */
export const useUtmCampaigns = (options?: { withTracking?: boolean }) => {
  const withTracking = options?.withTracking ?? false;
  
  return useQuery({
    queryKey: ["utm-campaigns", { withTracking }],
    queryFn: async (): Promise<UtmCampaignWithTracking[]> => {
      if (withTracking) {
        const { data, error } = await supabase
          .from("utm_campaigns")
          .select(`
            *,
            tracking:campaign_entity_tracking(*)
          `)
          .eq("is_active", true)
          .order("display_order", { ascending: true })
          .order("created_at", { ascending: false })
          .order("last_used_at", { ascending: false, nullsFirst: false })
          .order("usage_count", { ascending: false })
          .order("name");

        if (error) throw error;
        return data as unknown as UtmCampaignWithTracking[];
      } else {
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
        return data as UtmCampaignWithTracking[];
      }
    },
    staleTime: 2 * 60 * 1000, // 2 minutes - reduces refetches significantly
    gcTime: 5 * 60 * 1000,
    placeholderData: (previousData) => previousData,
  });
};

/**
 * @deprecated Use useUtmCampaigns({ withTracking: true }) for pre-joined data
 */
export const useUtmCampaignsLegacy = () => {
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
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
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
    mutationFn: async ({ id, name, landing_page, description }: { 
      id: string; 
      name?: string; 
      landing_page?: string | null;
      description?: string | null;
    }) => {
      const { data, error } = await supabase
        .from("utm_campaigns")
        .update({ name, landing_page, description })
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
      status?: string;
      platform?: string;
      entity?: string;
      launch_date?: string;
      campaign_link?: string;
      hubspot_utm_campaign?: string;
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
              status: campaign.status || null,
              platform: campaign.platform || null,
              entity: campaign.entity || null,
              launch_date: campaign.launch_date || null,
              campaign_link: campaign.campaign_link || null,
              hubspot_utm_campaign: campaign.hubspot_utm_campaign || null,
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
              status: campaign.status || 'Active',
              platform: campaign.platform || null,
              entity: campaign.entity || null,
              launch_date: campaign.launch_date || null,
              campaign_link: campaign.campaign_link || null,
              hubspot_utm_campaign: campaign.hubspot_utm_campaign || null,
              created_by: user.id,
            })
            .select("id")
            .single();
          
          if (error) throw error;
          campaignId = data.id;
          created++;
        }

        // FIX: Create entity tracking record if entity is specified
        if (campaign.entity && campaignId) {
          const { error: trackingError } = await supabase
            .from("campaign_entity_tracking")
            .upsert({
              campaign_id: campaignId,
              entity: campaign.entity,
              status: campaign.status || 'Draft',
            }, {
              onConflict: 'campaign_id,entity',
              ignoreDuplicates: true
            });
          if (trackingError) {
            logger.warn(`Failed to create tracking for ${campaign.name}:`, trackingError);
          }
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
              logger.warn(`Failed to create version for campaign ${campaign.name}:`, versionError);
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
