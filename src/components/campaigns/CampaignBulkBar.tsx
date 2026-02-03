import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
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
    if (!confirm(`Delete ${selectedCampaigns.length} campaigns?`)) return;
    await bulkDelete.mutateAsync({ campaignIds: selectedCampaigns });
    onClearSelection();
  };

  const toggleEntity = (name: string) => {
    setSelectedEntities(prev => prev.includes(name) ? prev.filter(e => e !== name) : [...prev, name]);
  };

  return (
    <div className={cn("fixed bottom-0 left-0 right-0 z-40 p-md bg-background/95 backdrop-blur-md border-t border-border animate-in slide-in-from-bottom-4")}>
      <div className="container max-w-[1440px] mx-auto flex items-center gap-md">
        <div className="flex items-center gap-sm">
          <Button variant="ghost" size="icon" onClick={onClearSelection} className="size-8">
            <X className="size-4" />
          </Button>
          <Badge variant="secondary">{selectedCampaigns.length} selected</Badge>
        </div>
        <div className="flex-1" />

        <Popover open={assignPopoverOpen} onOpenChange={setAssignPopoverOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" disabled={isLoading}><Building2 className="size-4" />Assign</Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-md" align="end">
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

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" disabled={isLoading}><RefreshCw className="size-4" />Status</Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-sm" align="end">
            <div className="space-y-xs">
              {ENTITY_TRACKING_STATUSES.map(s => (
                <Button key={s} variant="ghost" size="sm" className="w-full justify-start" onClick={() => handleStatusChange(s)} disabled={bulkUpdateStatus.isPending}>{s}</Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <Button variant="destructive" onClick={handleDelete} disabled={isLoading}>
          {bulkDelete.isPending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}Delete
        </Button>
      </div>
    </div>
  );
}
