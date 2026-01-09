import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface WebIntelSite {
  id: string;
  name: string;
  url: string;
  country: string;
  type: 'Website' | 'App' | 'Portal' | 'Forum' | 'News' | 'Lifestyle' | 'Finance' | 'Business' | 'Local';
  category?: string;
  estimated_monthly_traffic?: number;
  entity?: string;
  tags: string[];
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface HistoricPrice {
  id: string;
  site_id: string;
  year: number;
  price: number;
  notes?: string;
  created_at: string;
}

export interface PastCampaign {
  id: string;
  site_id: string;
  campaign_name: string;
  campaign_date: string;
  budget: number;
  ctr?: number;
  notes?: string;
  created_at: string;
}

export interface SiteWithDetails extends WebIntelSite {
  historic_prices: HistoricPrice[];
  past_campaigns: PastCampaign[];
}

export const useWebIntelSites = () => {
  const queryClient = useQueryClient();

  const { data: sites = [], isLoading } = useQuery({
    queryKey: ["web-intel-sites"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("web_intel_sites")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as WebIntelSite[];
    },
    staleTime: 60 * 1000, // 1 minute cache
  });

  const { data: allPrices = [] } = useQuery({
    queryKey: ["web-intel-prices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("web_intel_historic_prices")
        .select("*")
        .order("year", { ascending: false });

      if (error) throw error;
      return data as HistoricPrice[];
    },
    staleTime: 60 * 1000, // 1 minute cache
  });

  const { data: allCampaigns = [] } = useQuery({
    queryKey: ["web-intel-campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("web_intel_past_campaigns")
        .select("*")
        .order("campaign_date", { ascending: false });

      if (error) throw error;
      return data as PastCampaign[];
    },
    staleTime: 60 * 1000, // 1 minute cache
  });

  const createSite = useMutation({
    mutationFn: async (site: Omit<WebIntelSite, "id" | "created_at" | "updated_at" | "created_by">) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from("web_intel_sites")
        .insert([{ ...site, created_by: user?.id }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["web-intel-sites"] });
      toast.success("Site added successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to add site: ${error.message}`);
    },
  });

  const updateSite = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<WebIntelSite> & { id: string }) => {
      const { data, error } = await supabase
        .from("web_intel_sites")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["web-intel-sites"] });
      toast.success("Site updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update site: ${error.message}`);
    },
  });

  const deleteSite = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("web_intel_sites")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["web-intel-sites"] });
      queryClient.invalidateQueries({ queryKey: ["web-intel-prices"] });
      queryClient.invalidateQueries({ queryKey: ["web-intel-campaigns"] });
      toast.success("Site deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete site: ${error.message}`);
    },
  });

  const upsertPrices = useMutation({
    mutationFn: async ({ siteId, prices }: { siteId: string; prices: Omit<HistoricPrice, "id" | "created_at" | "site_id">[] }) => {
      // Delete existing prices for this site
      await supabase
        .from("web_intel_historic_prices")
        .delete()
        .eq("site_id", siteId);

      // Insert new prices
      if (prices.length > 0) {
        const { error } = await supabase
          .from("web_intel_historic_prices")
          .insert(prices.map(p => ({ ...p, site_id: siteId })));

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["web-intel-prices"] });
    },
  });

  const upsertCampaigns = useMutation({
    mutationFn: async ({ siteId, campaigns }: { siteId: string; campaigns: Omit<PastCampaign, "id" | "created_at" | "site_id">[] }) => {
      // Delete existing campaigns for this site
      await supabase
        .from("web_intel_past_campaigns")
        .delete()
        .eq("site_id", siteId);

      // Insert new campaigns
      if (campaigns.length > 0) {
        const { error } = await supabase
          .from("web_intel_past_campaigns")
          .insert(campaigns.map(c => ({ ...c, site_id: siteId })));

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["web-intel-campaigns"] });
    },
  });

  const getSiteWithDetails = (siteId: string): SiteWithDetails | undefined => {
    const site = sites.find(s => s.id === siteId);
    if (!site) return undefined;

    const historic_prices = allPrices.filter(p => p.site_id === siteId);
    const past_campaigns = allCampaigns.filter(c => c.site_id === siteId);

    return { ...site, historic_prices, past_campaigns };
  };

  return {
    sites,
    isLoading,
    allPrices,
    allCampaigns,
    createSite,
    updateSite,
    deleteSite,
    upsertPrices,
    upsertCampaigns,
    getSiteWithDetails,
  };
};
