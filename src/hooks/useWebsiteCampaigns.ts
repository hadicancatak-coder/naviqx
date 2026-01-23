import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface WebsiteCampaign {
  id: string;
  campaign_id: string;
  website_id: string;
  platforms: string[];
  created_at: string;
}

export const useWebsiteCampaigns = () => {
  const queryClient = useQueryClient();

  // Fetch all website-campaign associations
  const { data: websiteCampaigns = [], isLoading } = useQuery({
    queryKey: ['website-campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('website_campaigns')
        .select('*');
      
      if (error) throw error;
      return data as WebsiteCampaign[];
    },
    staleTime: 60 * 1000,
    placeholderData: (previousData) => previousData,
  });

  // Get websites for a specific campaign
  const getWebsitesByCampaign = (campaignId: string) => {
    return websiteCampaigns.filter(wc => wc.campaign_id === campaignId);
  };

  // Get campaigns for a specific website
  const getCampaignsByWebsite = (websiteId: string) => {
    return websiteCampaigns.filter(wc => wc.website_id === websiteId);
  };

  // Add website to campaign
  const addWebsiteToCampaign = useMutation({
    mutationFn: async ({ websiteId, campaignId, platforms }: { websiteId: string; campaignId: string; platforms: string[] }) => {
      const { data, error } = await supabase
        .from('website_campaigns')
        .insert({ website_id: websiteId, campaign_id: campaignId, platforms })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['website-campaigns'] });
      toast.success("Website added to campaign");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to add website to campaign");
    },
  });

  // Remove website from campaign
  const removeWebsiteFromCampaign = useMutation({
    mutationFn: async ({ websiteId, campaignId }: { websiteId: string; campaignId: string }) => {
      const { error } = await supabase
        .from('website_campaigns')
        .delete()
        .eq('website_id', websiteId)
        .eq('campaign_id', campaignId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['website-campaigns'] });
      toast.success("Website removed from campaign");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to remove website from campaign");
    },
  });

  return {
    websiteCampaigns,
    isLoading,
    getWebsitesByCampaign,
    getCampaignsByWebsite,
    addWebsiteToCampaign,
    removeWebsiteFromCampaign,
  };
};
