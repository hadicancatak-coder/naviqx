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

const BIDDING_STRATEGIES = [
  { value: 'maximize_clicks', label: 'Maximize Clicks' },
  { value: 'maximize_conversions', label: 'Maximize Conversions' },
  { value: 'target_cpa', label: 'Target CPA (tCPA)' },
  { value: 'target_roas', label: 'Target ROAS (tROAS)' },
  { value: 'maximize_conversion_value', label: 'Maximize Conversion Value' },
  { value: 'manual_cpc', label: 'Manual CPC' },
  { value: 'enhanced_cpc', label: 'Enhanced CPC (eCPC)' },
] as const;

const MATCH_TYPES = [
  { value: 'exact', label: 'Exact Match' },
  { value: 'phrase', label: 'Phrase Match' },
  { value: 'broad', label: 'Broad Match' },
] as const;

interface CreateAdGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  campaignName?: string;
  onSuccess?: () => void;
}

export function CreateAdGroupDialog({ open, onOpenChange, campaignId, campaignName, onSuccess }: CreateAdGroupDialogProps) {
  const [name, setName] = useState('');
  const [biddingStrategy, setBiddingStrategy] = useState('');
  const [matchTypes, setMatchTypes] = useState<string[]>([]);
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
    if (!biddingStrategy) {
      toast({ title: "Please select a bidding strategy", variant: "destructive" });
      return;
    }
    if (matchTypes.length === 0) {
      toast({ title: "Please select at least one match type", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('ad_groups')
        .insert({
          campaign_id: campaignId,
          name: name.trim(),
          bidding_strategy: biddingStrategy,
          match_types: matchTypes,
          status: 'active',
        });

      if (error) throw error;

      toast({ title: "Ad group created successfully" });
      setName('');
      setBiddingStrategy('');
      setMatchTypes([]);
      onOpenChange(false);
      onSuccess?.();
    } catch (error: unknown) {
      toast({ title: "Failed to create ad group", description: error instanceof Error ? error.message : "An error occurred", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Ad Group{campaignName && ` for ${campaignName}`}</DialogTitle>
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

          <div className="space-y-sm">
            <Label>Bidding Strategy *</Label>
            <Select value={biddingStrategy} onValueChange={setBiddingStrategy}>
              <SelectTrigger>
                <SelectValue placeholder="Select bidding strategy" />
              </SelectTrigger>
              <SelectContent>
                {BIDDING_STRATEGIES.map((strategy) => (
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
