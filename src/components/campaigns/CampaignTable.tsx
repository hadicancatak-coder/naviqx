import { useState, useMemo, useCallback } from "react";
import { Search, ArrowUpDown, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CampaignRow, CampaignRowData } from "./CampaignRow";
import { useUtmCampaigns, useUpdateUtmCampaign, useDeleteUtmCampaign } from "@/hooks/useUtmCampaigns";
import { useCampaignEntityTracking } from "@/hooks/useCampaignEntityTracking";
import { useSystemEntities } from "@/hooks/useSystemEntities";
import { EntityTrackingStatus } from "@/domain/campaigns";
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
}

export function CampaignTable({
  selectedCampaigns,
  onSelectionChange,
  entityFilter,
}: CampaignTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState<string | null>(null);

  const { data: campaigns = [], isLoading } = useUtmCampaigns({ withTracking: true });
  const { data: entities = [] } = useSystemEntities();
  const { trackingRecords, createTracking, updateTracking, deleteTracking } = useCampaignEntityTracking();
  const updateCampaign = useUpdateUtmCampaign();
  const deleteCampaign = useDeleteUtmCampaign();

  // Transform campaigns to row data
  // Note: versionCount is fetched per-row in CampaignRow component to avoid N+1 here
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
        versionCount: 0, // Will be fetched by VersionThumbnail component
      };
    });
  }, [campaigns, trackingRecords]);

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
    <div className="space-y-md">
      {/* Filters */}
      <div className="flex items-center gap-sm flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search campaigns..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={entityFilter || "all"}>
          <SelectTrigger className="w-[180px]">
            <Filter className="size-4 mr-2" />
            <SelectValue placeholder="All entities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Entities</SelectItem>
            {entities.map(e => (
              <SelectItem key={e.name} value={e.name}>
                {e.emoji} {e.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-body-sm text-muted-foreground">
          {filteredData.length} campaign{filteredData.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden bg-card">
        <ScrollArea className="h-[600px]">
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
                />
              ))}
            </tbody>
          </table>

          {filteredData.length === 0 && (
            <div className="flex items-center justify-center h-40 text-muted-foreground">
              {searchTerm ? "No campaigns match your search" : "No campaigns yet"}
            </div>
          )}
        </ScrollArea>
      </div>

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
