import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

interface DuplicateAdGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  adGroup: any;
  adsCount: number;
  onSuccess: () => void;
}

export function DuplicateAdGroupDialog({ open, onOpenChange, adGroup, adsCount, onSuccess }: DuplicateAdGroupDialogProps) {
  const [name, setName] = useState(`${adGroup?.name || ""} (Copy)`);
  const [selectedCampaignId, setSelectedCampaignId] = useState(adGroup?.campaign_id || "");
  const [includeAds, setIncludeAds] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const { data: campaigns = [] } = useQuery({
    queryKey: ['search-campaigns-for-duplicate'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('search_campaigns')
        .select('*')
        .order('name');
      if (error) throw error;
      return data || [];
    },
    staleTime: 60 * 1000,
  });

  const handleDuplicate = async () => {
    if (!name.trim()) {
      toast.error("Please enter an ad group name");
      return;
    }

    if (!selectedCampaignId) {
      toast.error("Please select a campaign");
      return;
    }

    setIsLoading(true);
    setProgress(0);

    try {
      // Create the new ad group
      const { data: newAdGroup, error: adGroupError } = await supabase
        .from('ad_groups')
        .insert({
          name: name.trim(),
          campaign_id: selectedCampaignId,
          status: adGroup.status || 'active'
        })
        .select()
        .single();

      if (adGroupError) throw adGroupError;
      setProgress(50);

      // If including ads, duplicate them
      if (includeAds && adsCount > 0) {
        const { data: ads, error: fetchError } = await supabase
          .from('ads')
          .select('*')
          .eq('ad_group_id', adGroup.id);

        if (fetchError) throw fetchError;

        if (ads && ads.length > 0) {
          const duplicatedAds = ads.map(ad => {
            const { id, created_at, updated_at, ...rest } = ad;
            return {
              ...rest,
              ad_group_id: newAdGroup.id,
              name: `${ad.name} (Copy)`
            };
          });

          const { error: insertError } = await supabase
            .from('ads')
            .insert(duplicatedAds);

          if (insertError) throw insertError;
        }
      }

      setProgress(100);
      toast.success(`Ad group duplicated successfully${includeAds && adsCount > 0 ? ` with ${adsCount} ad(s)` : ''}`);
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to duplicate ad group");
    } finally {
      setIsLoading(false);
      setProgress(0);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Duplicate Ad Group</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-md py-md">
          <div className="space-y-xs">
            <Label htmlFor="adgroup-name">New Ad Group Name *</Label>
            <Input
              id="adgroup-name"
              placeholder="Enter new ad group name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-xs">
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

          {adsCount > 0 && (
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="include-ads" 
                checked={includeAds} 
                onCheckedChange={(checked) => setIncludeAds(checked === true)} 
              />
              <Label htmlFor="include-ads" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Include all {adsCount} ad(s)
              </Label>
            </div>
          )}

          {isLoading && <Progress value={progress} className="w-full" />}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleDuplicate} disabled={isLoading}>
            {isLoading ? "Duplicating..." : "Duplicate Ad Group"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
