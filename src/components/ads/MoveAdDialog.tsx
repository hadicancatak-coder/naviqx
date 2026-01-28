import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { useAuth } from "@/hooks/useAuth";

interface MoveAdDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  adId: string;
  currentAdGroupId?: string;
  onSuccess?: () => void;
}

export function MoveAdDialog({
  open,
  onOpenChange,
  adId,
  currentAdGroupId,
  onSuccess,
}: MoveAdDialogProps) {
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
  const [selectedAdGroupId, setSelectedAdGroupId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  const { data: campaigns } = useQuery({
    queryKey: ['search-campaigns-for-move'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('search_campaigns')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    }
  });

  const { data: adGroups } = useQuery({
    queryKey: ['ad-groups-for-move', selectedCampaignId],
    enabled: !!selectedCampaignId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ad_groups')
        .select('*')
        .eq('campaign_id', selectedCampaignId)
        .order('name');
      if (error) throw error;
      return data;
    }
  });

  const handleMove = async () => {
    if (!selectedAdGroupId || !user) {
      toast.error("Please select an ad group");
      return;
    }

    setIsLoading(true);
    try {
      // Update the ad's ad_group_id
      const { error: updateError } = await supabase
        .from('ads')
        .update({ ad_group_id: selectedAdGroupId })
        .eq('id', adId);

      if (updateError) throw updateError;

      // Log the move
      const { error: logError } = await supabase
        .from('ad_move_history')
        .insert({
          ad_id: adId,
          from_ad_group_id: currentAdGroupId,
          to_ad_group_id: selectedAdGroupId,
          moved_by: user.id,
          action_type: 'move'
        });

      if (logError) throw logError;

      toast.success("Ad moved successfully");
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      logger.error('Error moving ad:', error);
      toast.error("Failed to move ad");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move Ad</DialogTitle>
          <DialogDescription>
            Select the campaign and ad group to move this ad to.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-md py-md">
          <div className="space-y-sm">
            <Label htmlFor="campaign">Campaign</Label>
            <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}>
              <SelectTrigger id="campaign">
                <SelectValue placeholder="Select campaign" />
              </SelectTrigger>
              <SelectContent>
                {campaigns?.map((campaign) => (
                  <SelectItem key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-sm">
            <Label htmlFor="adgroup">Ad Group</Label>
            <Select 
              value={selectedAdGroupId} 
              onValueChange={setSelectedAdGroupId}
              disabled={!selectedCampaignId}
            >
              <SelectTrigger id="adgroup">
                <SelectValue placeholder="Select ad group" />
              </SelectTrigger>
              <SelectContent>
                {adGroups?.map((adGroup) => (
                  <SelectItem key={adGroup.id} value={adGroup.id}>
                    {adGroup.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleMove} disabled={isLoading || !selectedAdGroupId}>
            {isLoading ? "Moving..." : "Move Ad"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
