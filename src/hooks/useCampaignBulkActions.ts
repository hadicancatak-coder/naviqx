import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { EntityTrackingStatus } from "@/domain/campaigns";

interface BulkAssignParams {
  campaignIds: string[];
  entities: string[];
  status: EntityTrackingStatus;
}

interface BulkStatusParams {
  trackingIds: string[];
  status: EntityTrackingStatus;
}

interface BulkDeleteParams {
  campaignIds: string[];
}

interface BulkImportParams {
  campaigns: Array<{
    name: string;
    landing_page?: string;
    campaign_type?: string;
    description?: string;
    entity?: string;
    status?: string;
    version_notes?: string;
    asset_link?: string;
    version_number?: number;
  }>;
}

export function useCampaignBulkActions() {
  const queryClient = useQueryClient();

  // Bulk assign campaigns to entities
  const bulkAssign = useMutation({
    mutationFn: async ({ campaignIds, entities, status }: BulkAssignParams) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const operations = campaignIds.flatMap(campaignId =>
        entities.map(entity => ({
          campaign_id: campaignId,
          entity,
          status,
          created_by: user.id,
        }))
      );

      const { data, error } = await supabase
        .from("campaign_entity_tracking")
        .upsert(operations, {
          onConflict: "campaign_id,entity",
          ignoreDuplicates: false,
        })
        .select();

      if (error) throw error;
      return { count: data?.length || 0 };
    },
    onSuccess: ({ count }) => {
      queryClient.invalidateQueries({ queryKey: ["campaign-entity-tracking"] });
      queryClient.invalidateQueries({ queryKey: ["utm-campaigns"] });
      toast.success(`${count} assignments created`);
    },
    onError: (error: Error) => {
      toast.error("Failed to assign: " + error.message);
    },
  });

  // Bulk update status for tracking records
  const bulkUpdateStatus = useMutation({
    mutationFn: async ({ trackingIds, status }: BulkStatusParams) => {
      const { data, error } = await supabase
        .from("campaign_entity_tracking")
        .update({ status, updated_at: new Date().toISOString() })
        .in("id", trackingIds)
        .select();

      if (error) throw error;
      return { count: data?.length || 0 };
    },
    onSuccess: ({ count }, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["campaign-entity-tracking"] });
      toast.success(`${count} campaigns updated to ${status}`);
    },
    onError: (error: Error) => {
      toast.error("Failed to update status: " + error.message);
    },
  });

  // Bulk delete campaigns
  const bulkDelete = useMutation({
    mutationFn: async ({ campaignIds }: BulkDeleteParams) => {
      // Soft delete by setting is_active = false
      const { data, error } = await supabase
        .from("utm_campaigns")
        .update({ is_active: false })
        .in("id", campaignIds)
        .select();

      if (error) throw error;
      return { count: data?.length || 0 };
    },
    onSuccess: ({ count }) => {
      queryClient.invalidateQueries({ queryKey: ["utm-campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["campaign-entity-tracking"] });
      toast.success(`${count} campaigns deleted`);
    },
    onError: (error: Error) => {
      toast.error("Failed to delete: " + error.message);
    },
  });

  // Bulk import via edge function
  const bulkImport = useMutation({
    mutationFn: async ({ campaigns }: BulkImportParams) => {
      const { data, error } = await supabase.functions.invoke("campaign-bulk-import", {
        body: { campaigns },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      return data as {
        success: boolean;
        created: number;
        updated: number;
        versionsCreated: number;
        errors?: string[];
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["utm-campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["campaign-entity-tracking"] });
      queryClient.invalidateQueries({ queryKey: ["campaign-versions"] });
      
      const parts = [];
      if (result.created > 0) parts.push(`${result.created} created`);
      if (result.updated > 0) parts.push(`${result.updated} updated`);
      if (result.versionsCreated > 0) parts.push(`${result.versionsCreated} versions`);
      
      toast.success(`Import complete: ${parts.join(", ")}`);
      
      if (result.errors?.length) {
        console.warn("Import warnings:", result.errors);
      }
    },
    onError: (error: Error) => {
      toast.error("Import failed: " + error.message);
    },
  });

  // Remove campaign from specific entity
  const removeFromEntity = useMutation({
    mutationFn: async ({ trackingId }: { trackingId: string }) => {
      const { error } = await supabase
        .from("campaign_entity_tracking")
        .delete()
        .eq("id", trackingId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaign-entity-tracking"] });
      toast.success("Campaign removed from entity");
    },
    onError: (error: Error) => {
      toast.error("Failed to remove: " + error.message);
    },
  });

  return {
    bulkAssign,
    bulkUpdateStatus,
    bulkDelete,
    bulkImport,
    removeFromEntity,
    isLoading: 
      bulkAssign.isPending || 
      bulkUpdateStatus.isPending || 
      bulkDelete.isPending || 
      bulkImport.isPending,
  };
}
