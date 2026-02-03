import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CampaignRow, CampaignRowData } from "./CampaignRow";
import { CampaignDetailSheet } from "./CampaignDetailSheet";
import { useUtmCampaigns, useUpdateUtmCampaign, useDeleteUtmCampaign } from "@/hooks/useUtmCampaigns";
import { useCampaignEntityTracking } from "@/hooks/useCampaignEntityTracking";
import { useSystemEntities } from "@/hooks/useSystemEntities";
import { EntityTrackingStatus } from "@/domain/campaigns";
import { supabase } from "@/integrations/supabase/client";
import { ACCOUNT_STRUCTURE_KEYS } from "@/lib/queryKeys";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type SortField = "name" | "versions" | "entities";
type SortDirection = "asc" | "desc";

interface CampaignTableProps {
  selectedCampaigns: string[];
  onSelectionChange: (ids: string[]) => void;
  entityFilter?: string;
  searchTerm?: string;
}

export function CampaignTable({
  selectedCampaigns,
  onSelectionChange,
  entityFilter,
  searchTerm = "",
}: CampaignTableProps) {
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState<string | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignRowData | null>(null);

  const { data: campaigns = [], isLoading } = useUtmCampaigns({ withTracking: true });
  const { data: entities = [] } = useSystemEntities();
  const { trackingRecords, createTracking, updateTracking, deleteTracking } = useCampaignEntityTracking();
  const updateCampaign = useUpdateUtmCampaign();
  const deleteCampaign = useDeleteUtmCampaign();

  // Fetch all version counts in one query
  const { data: versionCounts = {} } = useQuery({
    queryKey: ACCOUNT_STRUCTURE_KEYS.versionCounts,
    queryFn: async () => {
      const { data } = await supabase
        .from('utm_campaign_versions')
        .select('utm_campaign_id');
      
      const counts: Record<string, number> = {};
      data?.forEach(v => {
        counts[v.utm_campaign_id] = (counts[v.utm_campaign_id] || 0) + 1;
      });
      return counts;
    },
  });

  // Transform campaigns to row data with version counts
  const rowData = useMemo((): CampaignRowData[] => {
    return campaigns.map((campaign) => {
      const campaignTracking = trackingRecords.filter(t => t.campaign_id === campaign.id);
      return {
        id: campaign.id,
        name: campaign.name,
        landing_page: campaign.landing_page,
        campaign_type: campaign.campaign_type,
        description: campaign.description,
        entities: campaignTracking.map(t => ({
          trackingId: t.id,
          entity: t.entity,
          status: t.status as EntityTrackingStatus,
        })),
        versionCount: versionCounts[campaign.id] || 0,
      };
    });
  }, [campaigns, trackingRecords, versionCounts]);

  // Filter and sort
  const filteredData = useMemo(() => {
    let data = rowData;

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      data = data.filter(c =>
        c.name.toLowerCase().includes(term) ||
        c.landing_page?.toLowerCase().includes(term) ||
        c.entities.some(e => e.entity.toLowerCase().includes(term))
      );
    }

    // Entity filter
    if (entityFilter && entityFilter !== "all") {
      data = data.filter(c => c.entities.some(e => e.entity === entityFilter));
    }

    // Sort
    data = [...data].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "versions":
          comparison = a.versionCount - b.versionCount;
          break;
        case "entities":
          comparison = a.entities.length - b.entities.length;
          break;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });

    return data;
  }, [rowData, searchTerm, entityFilter, sortField, sortDirection]);

  // Selection handlers
  const handleSelectAll = useCallback(() => {
    if (selectedCampaigns.length === filteredData.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(filteredData.map(c => c.id));
    }
  }, [filteredData, selectedCampaigns.length, onSelectionChange]);

  const handleSelectOne = useCallback((id: string) => {
    onSelectionChange(
      selectedCampaigns.includes(id)
        ? selectedCampaigns.filter(i => i !== id)
        : [...selectedCampaigns, id]
    );
  }, [selectedCampaigns, onSelectionChange]);

  // Update handlers
  const handleUpdateName = useCallback(async (id: string, name: string) => {
    try {
      await updateCampaign.mutateAsync({ id, name });
    } catch {
      // Error handled by mutation
    }
  }, [updateCampaign]);

  const handleUpdateLP = useCallback(async (id: string, landing_page: string) => {
    try {
      await updateCampaign.mutateAsync({ id, landing_page });
    } catch {
      // Error handled by mutation
    }
  }, [updateCampaign]);

  const handleAddToEntity = useCallback(async (campaignId: string, entity: string, status: EntityTrackingStatus) => {
    try {
      await createTracking.mutateAsync({ campaign_id: campaignId, entity, status });
    } catch (error: unknown) {
      const err = error as { code?: string };
      if (err.code === "23505") {
        toast.error("Campaign already in this entity");
      }
    }
  }, [createTracking]);

  const handleRemoveFromEntity = useCallback(async (trackingId: string) => {
    try {
      await deleteTracking.mutateAsync(trackingId);
    } catch {
      // Error handled by mutation
    }
  }, [deleteTracking]);

  const handleUpdateEntityStatus = useCallback(async (trackingId: string, status: EntityTrackingStatus) => {
    try {
      await updateTracking.mutateAsync({ id: trackingId, status });
      toast.success(`Status updated to ${status}`);
    } catch {
      // Error handled by mutation
    }
  }, [updateTracking]);

  const handleDeleteRequest = useCallback((id: string) => {
    setCampaignToDelete(id);
    setDeleteDialogOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (campaignToDelete) {
      try {
        await deleteCampaign.mutateAsync(campaignToDelete);
      } catch {
        // Error handled by mutation
      }
    }
    setDeleteDialogOpen(false);
    setCampaignToDelete(null);
  }, [campaignToDelete, deleteCampaign]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const isAllSelected = filteredData.length > 0 && selectedCampaigns.length === filteredData.length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }


  return (
    <div className="border rounded-lg overflow-hidden bg-card">
      <table className="w-full">
        <thead className="bg-muted/50 sticky top-0 z-10">
          <tr className="border-b border-border">
            <th className="p-sm w-10">
              <Checkbox
                checked={isAllSelected}
                onCheckedChange={handleSelectAll}
              />
            </th>
            <th className="p-sm text-left">
              <Button variant="ghost" size="sm" className="h-7 -ml-2" onClick={() => toggleSort("name")}>
                Campaign
                <ArrowUpDown className="size-3 ml-1" />
              </Button>
            </th>
            <th className="p-sm text-left text-body-sm font-medium text-muted-foreground">
              Landing Page
            </th>
            <th className="p-sm text-left">
              <Button variant="ghost" size="sm" className="h-7 -ml-2" onClick={() => toggleSort("entities")}>
                Entities
                <ArrowUpDown className="size-3 ml-1" />
              </Button>
            </th>
            <th className="p-sm text-left">
              <Button variant="ghost" size="sm" className="h-7 -ml-2" onClick={() => toggleSort("versions")}>
                Versions
                <ArrowUpDown className="size-3 ml-1" />
              </Button>
            </th>
            <th className="p-sm text-left text-body-sm font-medium text-muted-foreground w-20">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {filteredData.map((campaign) => (
            <CampaignRow
              key={campaign.id}
              campaign={campaign}
              isSelected={selectedCampaigns.includes(campaign.id)}
              onSelect={handleSelectOne}
              onUpdateName={handleUpdateName}
              onUpdateLandingPage={handleUpdateLP}
              onAddToEntity={handleAddToEntity}
              onRemoveFromEntity={handleRemoveFromEntity}
              onUpdateEntityStatus={handleUpdateEntityStatus}
              onDelete={handleDeleteRequest}
              onOpenDetail={setSelectedCampaign}
            />
          ))}
        </tbody>
      </table>

      {filteredData.length === 0 && (
        <div className="flex items-center justify-center h-40 text-muted-foreground">
          {searchTerm ? "No campaigns match your search" : "No campaigns yet"}
        </div>
      )}

      {/* Campaign Detail Sheet */}
      <CampaignDetailSheet
        open={!!selectedCampaign}
        onOpenChange={(open) => !open && setSelectedCampaign(null)}
        campaign={selectedCampaign}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Campaign?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the campaign from all entities. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
