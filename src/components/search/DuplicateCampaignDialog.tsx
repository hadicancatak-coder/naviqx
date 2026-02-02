import { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

interface Campaign {
  id: string;
  name: string;
  entity?: string;
  status?: string;
  languages?: string[];
}

interface DuplicateCampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: Campaign | null;
  adGroupsCount: number;
  adsCount: number;
  onSuccess: () => void;
}

export function DuplicateCampaignDialog({ open, onOpenChange, campaign, adGroupsCount, adsCount, onSuccess }: DuplicateCampaignDialogProps) {
  const [name, setName] = useState(`${campaign?.name || ""} (Copy)`);
  const [includeAll, setIncludeAll] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");

  const handleDuplicate = async () => {
    if (!name.trim()) {
      toast.error("Please enter a campaign name");
      return;
    }

    setIsLoading(true);
    setProgress(0);

    try {
      // Create the new campaign
      setStatusText("Creating campaign...");
      const { data: newCampaign, error: campaignError } = await supabase
        .from('search_campaigns')
        .insert({
          name: name.trim(),
          entity: campaign.entity,
          status: campaign.status || 'active',
          languages: campaign.languages
        })
        .select()
        .single();

      if (campaignError) throw campaignError;
      setProgress(30);

      if (includeAll && adGroupsCount > 0) {
        // Fetch all ad groups
        setStatusText("Duplicating ad groups...");
        const { data: adGroups, error: fetchAdGroupsError } = await supabase
          .from('ad_groups')
          .select('*')
          .eq('campaign_id', campaign.id);

        if (fetchAdGroupsError) throw fetchAdGroupsError;

        if (adGroups && adGroups.length > 0) {
          // Map old ad group IDs to new ones
          const adGroupMap = new Map();

          for (let i = 0; i < adGroups.length; i++) {
            const ag = adGroups[i];
            const { id, created_at, updated_at, ...rest } = ag;
            
            const { data: newAdGroup, error: insertError } = await supabase
              .from('ad_groups')
              .insert({
                ...rest,
                campaign_id: newCampaign.id
              })
              .select()
              .single();

            if (insertError) throw insertError;
            adGroupMap.set(ag.id, newAdGroup.id);
            setProgress(30 + (40 * (i + 1)) / adGroups.length);
          }

          setStatusText("Duplicating ads...");
          setProgress(70);

          // Fetch and duplicate all ads
          const { data: ads, error: fetchAdsError } = await supabase
            .from('ads')
            .select('*')
            .in('ad_group_id', Array.from(adGroupMap.keys()));

          if (fetchAdsError) throw fetchAdsError;

          if (ads && ads.length > 0) {
            const duplicatedAds = ads.map(ad => {
              const { id, created_at, updated_at, ...rest } = ad;
              return {
                ...rest,
                ad_group_id: adGroupMap.get(ad.ad_group_id),
                name: `${ad.name} (Copy)`
              };
            });

            const { error: insertAdsError } = await supabase
              .from('ads')
              .insert(duplicatedAds);

            if (insertAdsError) throw insertAdsError;
          }
        }
      }

      setProgress(100);
      setStatusText("Done!");
      toast.success(`Campaign duplicated successfully${includeAll ? ` with ${adGroupsCount} ad group(s) and ${adsCount} ad(s)` : ''}`);
      onSuccess();
      onOpenChange(false);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to duplicate campaign");
    } finally {
      setIsLoading(false);
      setProgress(0);
      setStatusText("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Duplicate Campaign</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-md py-md">
          <div className="space-y-xs">
            <Label htmlFor="campaign-name">New Campaign Name *</Label>
            <Input
              id="campaign-name"
              placeholder="Enter new campaign name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {adGroupsCount > 0 && (
            <div className="space-y-xs">
              <div className="flex items-center space-x-xs">
                <Checkbox 
                  id="include-all" 
                  checked={includeAll} 
                  onCheckedChange={(checked) => setIncludeAll(checked === true)} 
                />
                <Label htmlFor="include-all" className="text-body-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Include all ad groups and ads
                </Label>
              </div>
              <div className="text-metadata text-muted-foreground ml-6">
                • {adGroupsCount} ad group(s)
                <br />
                • {adsCount} total ad(s)
              </div>
            </div>
          )}

          {isLoading && (
            <div className="space-y-xs">
              <Progress value={progress} className="w-full" />
              {statusText && <p className="text-body-sm text-muted-foreground text-center">{statusText}</p>}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleDuplicate} disabled={isLoading}>
            {isLoading ? "Duplicating..." : "Duplicate Campaign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
