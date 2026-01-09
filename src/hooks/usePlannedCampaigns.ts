import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PlannedCampaign {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  agency?: string;
  cities: string[];
  status: 'draft' | 'active' | 'completed';
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CampaignPlacement {
  id: string;
  campaign_id: string;
  location_id: string;
  notes?: string;
  created_at: string;
}

export const calculateDuration = (startDate: string, endDate: string): number => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(1, Math.round(diffDays / 30));
};

export const getSeasonIndicator = (startDate: string, endDate: string): string => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const hasUAEPeak = [10, 11, 0, 1, 2].some(month => {
    const testDate = new Date(start);
    while (testDate <= end) {
      if (testDate.getMonth() === month) return true;
      testDate.setMonth(testDate.getMonth() + 1);
    }
    return false;
  });
  
  const hasGCCSummer = [5, 6, 7].some(month => {
    const testDate = new Date(start);
    while (testDate <= end) {
      if (testDate.getMonth() === month) return true;
      testDate.setMonth(testDate.getMonth() + 1);
    }
    return false;
  });
  
  if (hasUAEPeak) return 'UAE Peak Season (Nov-Mar)';
  if (hasGCCSummer) return 'GCC Summer (Jun-Aug)';
  return 'Regular Season';
};

export const usePlannedCampaigns = () => {
  const queryClient = useQueryClient();

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["planned-campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("planned_campaigns")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as PlannedCampaign[];
    },
    staleTime: 60 * 1000, // 1 minute cache
  });

  const { data: allPlacements = [] } = useQuery({
    queryKey: ["campaign-placements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaign_placements")
        .select("*");

      if (error) throw error;
      return data as CampaignPlacement[];
    },
    staleTime: 60 * 1000, // 1 minute cache
  });

  const createCampaign = useMutation({
    mutationFn: async (campaign: Omit<PlannedCampaign, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from("planned_campaigns")
        .insert({
          ...campaign,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planned-campaigns"] });
      toast.success("Campaign created successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create campaign");
    },
  });

  const updateCampaign = useMutation({
    mutationFn: async ({ id, ...campaign }: Partial<PlannedCampaign> & { id: string }) => {
      const { data, error } = await supabase
        .from("planned_campaigns")
        .update(campaign)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planned-campaigns"] });
      toast.success("Campaign updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update campaign");
    },
  });

  const deleteCampaign = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("campaign_placements").delete().eq("campaign_id", id);
      const { error } = await supabase.from("planned_campaigns").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planned-campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["campaign-placements"] });
      toast.success("Campaign deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete campaign");
    },
  });

  const getPlacementsForCampaign = (campaignId: string): CampaignPlacement[] => {
    return allPlacements.filter(p => p.campaign_id === campaignId);
  };

  return {
    campaigns,
    isLoading,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    getPlacementsForCampaign,
    allPlacements,
  };
};
