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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface DuplicateAdDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  adId: string;
  onSuccess?: () => void;
}

export function DuplicateAdDialog({
  open,
  onOpenChange,
  adId,
  onSuccess,
}: DuplicateAdDialogProps) {
  const [newName, setNewName] = useState("");
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
  const [selectedAdGroupId, setSelectedAdGroupId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  const { data: originalAd } = useQuery({
    queryKey: ['ad-for-duplicate', adId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ads')
        .select('*')
        .eq('id', adId)
        .single();
      if (error) throw error;
      return data;
    }
  });

  const { data: campaigns } = useQuery({
    queryKey: ['search-campaigns-for-duplicate'],
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
    queryKey: ['ad-groups-for-duplicate', selectedCampaignId],
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

  const handleDuplicate = async () => {
    if (!selectedAdGroupId || !newName || !user || !originalAd) {
      toast.error("Please fill all fields");
      return;
    }

    setIsLoading(true);
    try {
      const { id, created_at, updated_at, ...adData } = originalAd;
      
      const { data: newAd, error: insertError } = await supabase
        .from('ads')
        .insert({
          ...adData,
          name: newName,
          ad_group_id: selectedAdGroupId,
          created_by: user.id,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Log the duplicate action
      const { error: logError } = await supabase
        .from('ad_move_history')
        .insert({
          ad_id: newAd.id,
          from_ad_group_id: originalAd.ad_group_id,
          to_ad_group_id: selectedAdGroupId,
          moved_by: user.id,
          action_type: 'duplicate'
        });

      if (logError) throw logError;

      toast.success("Ad duplicated successfully");
      onOpenChange(false);
      onSuccess?.();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to duplicate ad");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Duplicate Ad</DialogTitle>
          <DialogDescription>
            Create a copy of this ad in a different location.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-md py-md">
          <div className="space-y-sm">
            <Label htmlFor="name">New Ad Name</Label>
            <Input
              id="name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Enter ad name"
            />
          </div>

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
          <Button onClick={handleDuplicate} disabled={isLoading || !selectedAdGroupId || !newName}>
            {isLoading ? "Duplicating..." : "Duplicate Ad"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
