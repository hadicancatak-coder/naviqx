import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// AdData interface for ads being duplicated - accepts data from parent components
// with flexible typing to handle Json from Supabase
interface AdData {
  id?: string;
  name: string;
  ad_group_id?: string | null;
  ad_group_name?: string;
  campaign_name?: string;
  entity?: string;
  ad_type?: string;
  headlines?: string[] | unknown;
  descriptions?: string[] | unknown;
  sitelinks?: unknown;
  callouts?: unknown;
  landing_page?: string;
  business_name?: string;
  language?: string;
  approval_status?: string;
  [key: string]: unknown;
}

interface DuplicateAdDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ad: AdData;
  onSuccess: () => void;
}

export function DuplicateAdDialog({ open, onOpenChange, ad, onSuccess }: DuplicateAdDialogProps) {
  const [name, setName] = useState(`${ad?.name || ""} (Copy)`);
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [selectedAdGroupId, setSelectedAdGroupId] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { data: campaigns = [] } = useQuery({
    queryKey: ['search-campaigns-for-duplicate'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('search_campaigns')
        .select('*')
        .order('name');
      if (error) throw error;
      return data || [];
    }
  });

  const { data: adGroups = [] } = useQuery({
    queryKey: ['ad-groups-for-duplicate', selectedCampaignId],
    queryFn: async () => {
      if (!selectedCampaignId) return [];
      const { data, error } = await supabase
        .from('ad_groups')
        .select('*')
        .eq('campaign_id', selectedCampaignId)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedCampaignId
  });

  const handleDuplicate = async () => {
    if (!name.trim()) {
      toast.error("Please enter an ad name");
      return;
    }

    if (!selectedAdGroupId) {
      toast.error("Please select an ad group");
      return;
    }

    setIsLoading(true);

    try {
      const { id, created_at, updated_at, ...adData } = ad;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase insert type mismatch
      const { data: newAd, error } = await supabase
        .from('ads')
        .insert({
          ...adData,
          name: name.trim(),
          ad_group_id: selectedAdGroupId
        } as any)
        .select()
        .single();

      if (error) throw error;

      // Log the duplication action
      await supabase.from('ad_move_history').insert({
        action_type: 'duplicated',
        from_ad_group_id: ad.ad_group_id,
        to_ad_group_id: selectedAdGroupId,
        moved_by: (await supabase.auth.getUser()).data.user?.id
      });

      toast.success("Ad duplicated successfully");
      onSuccess();
      onOpenChange(false);
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
        </DialogHeader>
        
        <div className="space-y-md py-md">
          <div className="space-y-sm">
            <Label htmlFor="ad-name">New Ad Name *</Label>
            <Input
              id="ad-name"
              placeholder="Enter new ad name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-sm">
            <Label htmlFor="campaign">Target Campaign *</Label>
            <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}>
              <SelectTrigger id="campaign">
                <SelectValue placeholder="Select campaign" />
              </SelectTrigger>
              <SelectContent>
                {campaigns.map(campaign => (
                  <SelectItem key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-sm">
            <Label htmlFor="adgroup">Target Ad Group *</Label>
            <Select 
              value={selectedAdGroupId} 
              onValueChange={setSelectedAdGroupId}
              disabled={!selectedCampaignId}
            >
              <SelectTrigger id="adgroup">
                <SelectValue placeholder="Select ad group" />
              </SelectTrigger>
              <SelectContent>
                {adGroups.map(adGroup => (
                  <SelectItem key={adGroup.id} value={adGroup.id}>
                    {adGroup.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleDuplicate} disabled={isLoading}>
            {isLoading ? "Duplicating..." : "Duplicate Ad"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
