import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CampaignEntityTracking {
  id: string;
  campaign_id: string;
  entity: string;
  status: string;
  notes: string | null;
  entity_comments: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export const useCampaignEntityTracking = () => {
  const queryClient = useQueryClient();

  // Fetch all tracking records
  const { data: trackingRecords = [], isLoading } = useQuery({
    queryKey: ["campaign-entity-tracking"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaign_entity_tracking")
        .select("*")
        .order("entity", { ascending: true })
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as CampaignEntityTracking[];
    },
    staleTime: 30 * 1000,
    placeholderData: (previousData) => previousData,
  });

  // Create tracking record
  const createTracking = useMutation({
    mutationFn: async (tracking: {
      campaign_id: string;
      entity: string;
      status?: string;
      notes?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from("campaign_entity_tracking")
        .insert({
          ...tracking,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaign-entity-tracking"] });
      toast.success("Campaign added to entity");
    },
    onError: (error: any) => {
      if (error.code === "23505") {
        toast.error("Campaign already exists in this entity");
      } else {
        toast.error("Failed to add campaign to entity");
      }
    },
  });

  // Update tracking record
  const updateTracking = useMutation({
    mutationFn: async (tracking: Partial<CampaignEntityTracking> & { id: string }) => {
      const { id, ...updates } = tracking;
      const { data, error } = await supabase
        .from("campaign_entity_tracking")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaign-entity-tracking"] });
    },
    onError: () => {
      toast.error("Failed to update campaign");
    },
  });

  // Delete tracking record
  const deleteTracking = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("campaign_entity_tracking")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaign-entity-tracking"] });
      toast.success("Campaign removed from entity");
    },
    onError: () => {
      toast.error("Failed to remove campaign");
    },
  });

  // Helper: Get campaigns by entity
  const getCampaignsByEntity = (entity: string) => {
    return trackingRecords.filter((t) => t.entity === entity);
  };

  // Helper: Get entities for a campaign
  const getEntitiesForCampaign = (campaignId: string) => {
    return trackingRecords.filter((t) => t.campaign_id === campaignId);
  };

  // Helper: Get entity comments
  const getEntityComments = (entity: string) => {
    const entityRecords = trackingRecords.filter((t) => t.entity === entity);
    return entityRecords.length > 0 ? entityRecords[0].entity_comments : null;
  };

  // Update entity comments
  const updateEntityComments = useMutation({
    mutationFn: async ({ entity, comments }: { entity: string; comments: string }) => {
      // Update all tracking records for this entity
      const entityRecords = trackingRecords.filter((t) => t.entity === entity);
      if (entityRecords.length === 0) return null;

      const { data, error } = await supabase
        .from("campaign_entity_tracking")
        .update({ entity_comments: comments })
        .eq("entity", entity)
        .select()
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaign-entity-tracking"] });
    },
  });

  // Bulk update status for multiple tracking records
  const bulkUpdateStatus = useMutation({
    mutationFn: async ({ trackingIds, status }: { trackingIds: string[]; status: string }) => {
      const { data, error } = await supabase
        .from("campaign_entity_tracking")
        .update({ status })
        .in("id", trackingIds)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["campaign-entity-tracking"] });
      toast.success(`Status updated to ${status}`);
    },
    onError: () => {
      toast.error("Failed to update status");
    },
  });

  return {
    trackingRecords,
    isLoading,
    createTracking,
    updateTracking,
    deleteTracking,
    bulkUpdateStatus,
    getCampaignsByEntity,
    getEntitiesForCampaign,
    getEntityComments,
    updateEntityComments,
  };
};
