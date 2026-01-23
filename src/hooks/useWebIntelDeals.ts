import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface WebIntelDeal {
  id: string;
  name: string;
  status: 'Active' | 'Pending' | 'Expired' | 'Cancelled';
  contract_link: string | null;
  contact_email: string | null;
  contact_name: string | null;
  website_id: string | null;
  entity: string | null;
  notes: string | null;
  start_date: string | null;
  end_date: string | null;
  deal_value: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DealCampaign {
  id: string;
  deal_id: string;
  campaign_id: string;
  created_at: string;
}

export interface DealUtmLink {
  id: string;
  deal_id: string;
  utm_link_id: string;
  created_at: string;
}

export const useWebIntelDeals = () => {
  const queryClient = useQueryClient();

  // Fetch all deals
  const { data: deals = [], isLoading: isLoadingDeals } = useQuery({
    queryKey: ['web-intel-deals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('web_intel_deals')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as WebIntelDeal[];
    },
    staleTime: 60 * 1000,
    placeholderData: (previousData) => previousData,
  });

  // Fetch deal campaigns
  const { data: dealCampaigns = [] } = useQuery({
    queryKey: ['deal-campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deal_campaigns')
        .select('*');
      
      if (error) throw error;
      return data as DealCampaign[];
    },
    staleTime: 60 * 1000,
    placeholderData: (previousData) => previousData,
  });

  // Fetch deal UTM links
  const { data: dealUtmLinks = [] } = useQuery({
    queryKey: ['deal-utm-links'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deal_utm_links')
        .select('*');
      
      if (error) throw error;
      return data as DealUtmLink[];
    },
    staleTime: 60 * 1000,
    placeholderData: (previousData) => previousData,
  });

  // Create deal
  const createDeal = useMutation({
    mutationFn: async (deal: Omit<WebIntelDeal, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('web_intel_deals')
        .insert({ ...deal, created_by: user?.id, status: deal.status || 'Active' })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['web-intel-deals'] });
      toast.success("Deal created successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create deal");
    },
  });

  // Update deal
  const updateDeal = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<WebIntelDeal> & { id: string }) => {
      const { data, error } = await supabase
        .from('web_intel_deals')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['web-intel-deals'] });
      toast.success("Deal updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update deal");
    },
  });

  // Delete deal
  const deleteDeal = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('web_intel_deals')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['web-intel-deals'] });
      toast.success("Deal deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete deal");
    },
  });

  // Add campaign to deal
  const addCampaignToDeal = useMutation({
    mutationFn: async ({ dealId, campaignId }: { dealId: string; campaignId: string }) => {
      const { data, error } = await supabase
        .from('deal_campaigns')
        .insert({ deal_id: dealId, campaign_id: campaignId })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deal-campaigns'] });
      toast.success("Campaign added to deal");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to add campaign to deal");
    },
  });

  // Add UTM link to deal
  const addUtmLinkToDeal = useMutation({
    mutationFn: async ({ dealId, utmLinkId }: { dealId: string; utmLinkId: string }) => {
      const { data, error } = await supabase
        .from('deal_utm_links')
        .insert({ deal_id: dealId, utm_link_id: utmLinkId })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deal-utm-links'] });
      toast.success("UTM link added to deal");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to add UTM link to deal");
    },
  });

  // Get campaigns for a deal
  const getCampaignsByDeal = (dealId: string) => {
    return dealCampaigns.filter(dc => dc.deal_id === dealId);
  };

  // Get UTM links for a deal
  const getUtmLinksByDeal = (dealId: string) => {
    return dealUtmLinks.filter(dul => dul.deal_id === dealId);
  };

  return {
    deals,
    isLoading: isLoadingDeals,
    dealCampaigns,
    dealUtmLinks,
    createDeal,
    updateDeal,
    deleteDeal,
    addCampaignToDeal,
    addUtmLinkToDeal,
    getCampaignsByDeal,
    getUtmLinksByDeal,
  };
};
