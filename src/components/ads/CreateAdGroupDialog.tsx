import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

// Search bidding strategies
const SEARCH_BIDDING_STRATEGIES = [
  { value: 'maximize_clicks', label: 'Maximize Clicks' },
  { value: 'maximize_conversions', label: 'Maximize Conversions' },
  { value: 'target_cpa', label: 'Target CPA (tCPA)' },
  { value: 'target_roas', label: 'Target ROAS (tROAS)' },
  { value: 'maximize_conversion_value', label: 'Maximize Conversion Value' },
  { value: 'manual_cpc', label: 'Manual CPC' },
  { value: 'enhanced_cpc', label: 'Enhanced CPC (eCPC)' },
] as const;

// Display bidding strategies (filtered)
const DISPLAY_BIDDING_STRATEGIES = [
  { value: 'maximize_clicks', label: 'Maximize Clicks' },
  { value: 'maximize_conversions', label: 'Maximize Conversions' },
  { value: 'target_cpa', label: 'Target CPA' },
  { value: 'target_roas', label: 'Target ROAS' },
] as const;

const MATCH_TYPES = [
  { value: 'exact', label: 'Exact Match' },
  { value: 'phrase', label: 'Phrase Match' },
  { value: 'broad', label: 'Broad Match' },
] as const;

const APP_PLATFORMS = [
  { value: 'android', label: 'Android' },
  { value: 'ios', label: 'iOS' },
] as const;

const APP_SUBTYPES = [
  { value: 'app_installs', label: 'App Installs' },
  { value: 'app_engagement', label: 'App Engagement' },
] as const;

const TARGETING_METHODS = [
  { value: 'contextual', label: 'Contextual' },
  { value: 'audience', label: 'Audience' },
  { value: 'placement', label: 'Placement' },
] as const;

interface CreateAdGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  campaignName?: string;
  campaignType?: string;
  onSuccess?: () => void;
}

export function CreateAdGroupDialog({ open, onOpenChange, campaignId, campaignName, campaignType = 'search', onSuccess }: CreateAdGroupDialogProps) {
  const [name, setName] = useState('');
  const [biddingStrategy, setBiddingStrategy] = useState('');
  const [matchTypes, setMatchTypes] = useState<string[]>([]);
  const [appPlatform, setAppPlatform] = useState('');
  const [appSubtype, setAppSubtype] = useState('');
  const [targetingMethod, setTargetingMethod] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const toggleMatchType = (value: string) => {
    setMatchTypes(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      toast({ title: "Ad group name is required", variant: "destructive" });
      return;
    }

    // Type-specific validation
    if (campaignType === 'search') {
      if (!biddingStrategy) {
        toast({ title: "Please select a bidding strategy", variant: "destructive" });
        return;
      }
      if (matchTypes.length === 0) {
        toast({ title: "Please select at least one match type", variant: "destructive" });
        return;
      }
    } else if (campaignType === 'app') {
      if (!appPlatform) {
        toast({ title: "Please select a platform", variant: "destructive" });
        return;
      }
      if (!appSubtype) {
        toast({ title: "Please select a campaign sub-type", variant: "destructive" });
        return;
      }
    }
    // Display: only name required

    setIsLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const insertData: any = {
        campaign_id: campaignId,
        name: name.trim(),
        status: 'active',
      };

      if (campaignType === 'search') {
        insertData.bidding_strategy = biddingStrategy;
        insertData.match_types = matchTypes;
      } else if (campaignType === 'app') {
        insertData.app_platform = appPlatform;
        insertData.app_subtype = appSubtype;
      } else if (campaignType === 'display') {
        if (targetingMethod) insertData.targeting_method = targetingMethod;
        if (biddingStrategy) insertData.bidding_strategy = biddingStrategy;
      }

      const { error } = await supabase
        .from('ad_groups')
        .insert(insertData);

      if (error) throw error;

      toast({ title: "Ad group created successfully" });
      // Reset form
      setName('');
      setBiddingStrategy('');
      setMatchTypes([]);
      setAppPlatform('');
      setAppSubtype('');
      setTargetingMethod('');
      onOpenChange(false);
      onSuccess?.();
    } catch (error: unknown) {
      toast({ title: "Failed to create ad group", description: error instanceof Error ? error.message : "An error occurred", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const typeLabel = campaignType === 'app' ? 'App' : campaignType === 'display' ? 'Display' : 'Search';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create {typeLabel} Ad Group{campaignName && ` for ${campaignName}`}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-md py-md">
          <div className="space-y-sm">
            <Label htmlFor="adgroup-name">Ad Group Name *</Label>
            <Input
              id="adgroup-name"
              placeholder="e.g., Exact Match Keywords"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* SEARCH: Bidding Strategy + Match Types */}
          {campaignType === 'search' && (
            <>
              <div className="space-y-sm">
                <Label>Bidding Strategy *</Label>
                <Select value={biddingStrategy} onValueChange={setBiddingStrategy}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select bidding strategy" />
                  </SelectTrigger>
                  <SelectContent>
                    {SEARCH_BIDDING_STRATEGIES.map((strategy) => (
                      <SelectItem key={strategy.value} value={strategy.value}>
                        {strategy.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-sm">
                <Label>Keyword Match Type Strategy *</Label>
                <p className="text-metadata text-muted-foreground">Select one or more match types</p>
                <div className="space-y-xs">
                  {MATCH_TYPES.map((type) => (
                    <div key={type.value} className="flex items-center gap-sm">
                      <Checkbox
                        id={`match-${type.value}`}
                        checked={matchTypes.includes(type.value)}
                        onCheckedChange={() => toggleMatchType(type.value)}
                      />
                      <Label htmlFor={`match-${type.value}`} className="cursor-pointer font-normal">
                        {type.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* APP: Platform + Sub-type */}
          {campaignType === 'app' && (
            <>
              <div className="space-y-sm">
                <Label>Platform *</Label>
                <Select value={appPlatform} onValueChange={setAppPlatform}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent>
                    {APP_PLATFORMS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-sm">
                <Label>Campaign Sub-type *</Label>
                <Select value={appSubtype} onValueChange={setAppSubtype}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select sub-type" />
                  </SelectTrigger>
                  <SelectContent>
                    {APP_SUBTYPES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* DISPLAY: Targeting Method + Bidding */}
          {campaignType === 'display' && (
            <>
              <div className="space-y-sm">
                <Label>Targeting Method</Label>
                <Select value={targetingMethod} onValueChange={setTargetingMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select targeting method" />
                  </SelectTrigger>
                  <SelectContent>
                    {TARGETING_METHODS.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-sm">
                <Label>Bidding Strategy</Label>
                <Select value={biddingStrategy} onValueChange={setBiddingStrategy}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select bidding strategy" />
                  </SelectTrigger>
                  <SelectContent>
                    {DISPLAY_BIDDING_STRATEGIES.map((strategy) => (
                      <SelectItem key={strategy.value} value={strategy.value}>
                        {strategy.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Ad Group
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
