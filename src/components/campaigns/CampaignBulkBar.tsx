import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
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
import { X, Building2, RefreshCw, Trash2, Loader2 } from "lucide-react";
import { useCampaignBulkActions } from "@/hooks/useCampaignBulkActions";
import { ENTITY_TRACKING_STATUSES, type EntityTrackingStatus } from "@/domain/campaigns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { UtmCampaignWithTracking } from "@/hooks/useUtmCampaigns";

interface SystemEntity {
  name: string;
  emoji: string;
}

interface CampaignBulkBarProps {
  selectedCampaigns: string[];
  onClearSelection: () => void;
  entities: SystemEntity[];
  campaigns: UtmCampaignWithTracking[];
}

export function CampaignBulkBar({ 
  selectedCampaigns, 
  onClearSelection,
  entities,
  campaigns,
}: CampaignBulkBarProps) {
  const [assignPopoverOpen, setAssignPopoverOpen] = useState(false);
  const [selectedEntities, setSelectedEntities] = useState<string[]>([]);
  const [assignStatus, setAssignStatus] = useState<EntityTrackingStatus>("Draft");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const { bulkAssign, bulkUpdateStatus, bulkDelete, isLoading } = useCampaignBulkActions();

  if (selectedCampaigns.length === 0) return null;

  const handleAssign = async () => {
    if (selectedEntities.length === 0) return;
    await bulkAssign.mutateAsync({ campaignIds: selectedCampaigns, entities: selectedEntities, status: assignStatus });
    setSelectedEntities([]);
    setAssignPopoverOpen(false);
    onClearSelection();
  };

  const handleStatusChange = async (status: EntityTrackingStatus) => {
    const trackingIds = selectedCampaigns.flatMap(campaignId => {
      const campaign = campaigns.find(c => c.id === campaignId);
      return campaign?.tracking?.map(t => t.id) || [];
    });
    if (trackingIds.length === 0) {
      toast.error("Selected campaigns are not assigned to any entities");
      return;
    }
    await bulkUpdateStatus.mutateAsync({ trackingIds, status });
    onClearSelection();
  };

  const handleDelete = async () => {
    await bulkDelete.mutateAsync({ campaignIds: selectedCampaigns });
    setShowDeleteDialog(false);
    onClearSelection();
  };

  const toggleEntity = (name: string) => {
    setSelectedEntities(prev => prev.includes(name) ? prev.filter(e => e !== name) : [...prev, name]);
  };

  return (
    <>
      <Card className="fixed bottom-6 left-1/2 -translate-x-1/2 z-overlay shadow-soft border-2">
        <div className="flex items-center gap-md p-md flex-wrap">
          <div className="flex items-center gap-xs">
            <span className="font-semibold">{selectedCampaigns.length}</span>
            <span className="text-muted-foreground">selected</span>
          </div>

          <div className="h-6 w-px bg-border" />

          <div className="flex items-center gap-xs flex-wrap">
            <Button variant="ghost" size="sm" onClick={onClearSelection} className="h-8">
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>

            <Popover open={assignPopoverOpen} onOpenChange={setAssignPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" disabled={isLoading} className="h-8">
                  <Building2 className="h-4 w-4 mr-1" />
                  Assign
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-md" align="center">
                <div className="space-y-md">
                  <div className="space-y-sm">
                    <p className="text-body-sm font-medium">Select Entities</p>
                    <div className="flex flex-wrap gap-xs">
                      {entities.map(entity => (
                        <label key={entity.name} className={cn("flex items-center gap-xs px-sm py-xs rounded-md cursor-pointer border", selectedEntities.includes(entity.name) ? "bg-primary/10 border-primary/30" : "bg-muted/50 border-border")}>
                          <Checkbox checked={selectedEntities.includes(entity.name)} onCheckedChange={() => toggleEntity(entity.name)} className="size-3.5" />
                          <span className="text-body-sm">{entity.emoji} {entity.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-sm">
                    <p className="text-body-sm font-medium">Status</p>
                    <Select value={assignStatus} onValueChange={(v) => setAssignStatus(v as EntityTrackingStatus)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ENTITY_TRACKING_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleAssign} disabled={selectedEntities.length === 0 || bulkAssign.isPending} className="w-full">
                    {bulkAssign.isPending ? <><Loader2 className="size-4 animate-spin" />Assigning...</> : `Apply to ${selectedCampaigns.length}`}
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            <Select onValueChange={(v) => handleStatusChange(v as EntityTrackingStatus)} disabled={isLoading}>
              <SelectTrigger className="h-8 w-[110px]">
                <RefreshCw className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {ENTITY_TRACKING_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>

            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              disabled={isLoading}
              className="h-8"
            >
              {bulkDelete.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1" />}
              Delete
            </Button>
          </div>
        </div>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedCampaigns.length} campaigns?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the selected campaigns and all their versions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
