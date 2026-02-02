import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface CreateAdGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  campaignName?: string;
  onSuccess?: () => void;
}

export function CreateAdGroupDialog({ open, onOpenChange, campaignId, campaignName, onSuccess }: CreateAdGroupDialogProps) {
  const [name, setName] = useState('');
  const [maxCpc, setMaxCpc] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleCreate = async () => {
    if (!name.trim()) {
      toast({ title: "Ad group name is required", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('ad_groups')
        .insert({
          campaign_id: campaignId,
          name: name.trim(),
          max_cpc: maxCpc ? parseFloat(maxCpc) : null,
          status: 'active',
        });

      if (error) throw error;

      toast({ title: "Ad group created successfully" });
      setName('');
      setMaxCpc('');
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
            <Label htmlFor="max-cpc">Max CPC (Optional)</Label>
            <Input
              id="max-cpc"
              type="number"
              step="0.01"
              placeholder="e.g., 2.50"
              value={maxCpc}
              onChange={(e) => setMaxCpc(e.target.value)}
            />
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
