import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSystemEntities } from '@/hooks/useSystemEntities';

type MoveType = 'ad_group' | 'ad';

interface MoveItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moveType: MoveType;
  itemId: string;
  itemName: string;
  currentCampaignId?: string;
  currentAdGroupId?: string;
  currentEntity?: string;
  onSuccess?: () => void;
}

export function MoveItemDialog({
  open,
  onOpenChange,
  moveType,
  itemId,
  itemName,
  currentCampaignId,
  currentAdGroupId,
  currentEntity,
  onSuccess,
}: MoveItemDialogProps) {
  const queryClient = useQueryClient();
  const { data: systemEntities = [] } = useSystemEntities();
  const [selectedEntity, setSelectedEntity] = useState(currentEntity || '');
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [selectedAdGroup, setSelectedAdGroup] = useState('');
  const [isMoving, setIsMoving] = useState(false);

  // Fetch campaigns for selected entity
  const { data: campaigns = [] } = useQuery({
    queryKey: ['move-campaigns', selectedEntity],
    queryFn: async () => {
      const { data } = await supabase
        .from('search_campaigns')
        .select('id, name, campaign_type')
        .eq('entity', selectedEntity)
        .order('name');
      return data || [];
    },
    enabled: open && !!selectedEntity,
  });

  // Fetch ad groups for selected campaign (only for ad moves)
  const { data: adGroups = [] } = useQuery({
    queryKey: ['move-ad-groups', selectedCampaign],
    queryFn: async () => {
      const { data } = await supabase
        .from('ad_groups')
        .select('id, name')
        .eq('campaign_id', selectedCampaign)
        .order('name');
      return data || [];
    },
    enabled: open && moveType === 'ad' && !!selectedCampaign,
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['search-campaigns-hierarchy'] });
    queryClient.invalidateQueries({ queryKey: ['ad-groups-hierarchy'] });
    queryClient.invalidateQueries({ queryKey: ['ads-hierarchy'] });
  };

  const handleMove = async () => {
    setIsMoving(true);
    try {
      if (moveType === 'ad_group') {
        if (!selectedCampaign) {
          toast.error('Please select a target campaign');
          return;
        }
        if (selectedCampaign === currentCampaignId) {
          toast.error('Ad group is already in this campaign');
          return;
        }
        const { error } = await supabase
          .from('ad_groups')
          .update({ campaign_id: selectedCampaign })
          .eq('id', itemId);
        if (error) throw error;
        toast.success(`Moved "${itemName}" to new campaign`);
      } else {
        if (!selectedAdGroup) {
          toast.error('Please select a target ad group');
          return;
        }
        if (selectedAdGroup === currentAdGroupId) {
          toast.error('Ad is already in this ad group');
          return;
        }
        const { error } = await supabase
          .from('ads')
          .update({ ad_group_id: selectedAdGroup })
          .eq('id', itemId);
        if (error) throw error;
        toast.success(`Moved "${itemName}" to new ad group`);
      }
      invalidateAll();
      onSuccess?.();
      onOpenChange(false);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to move item');
    } finally {
      setIsMoving(false);
    }
  };

  const title = moveType === 'ad_group' ? 'Move Ad Group' : 'Move Ad';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Move "{itemName}" to a different {moveType === 'ad_group' ? 'campaign' : 'ad group'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-md py-md">
          {/* Entity selector */}
          <div className="space-y-sm">
            <Label>Entity</Label>
            <Select value={selectedEntity} onValueChange={(v) => { setSelectedEntity(v); setSelectedCampaign(''); setSelectedAdGroup(''); }}>
              <SelectTrigger>
                <SelectValue placeholder="Select entity" />
              </SelectTrigger>
              <SelectContent>
                {systemEntities.map(e => (
                  <SelectItem key={e.name} value={e.name}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Campaign selector */}
          <div className="space-y-sm">
            <Label>Target Campaign {moveType === 'ad_group' ? '*' : ''}</Label>
            <Select value={selectedCampaign} onValueChange={(v) => { setSelectedCampaign(v); setSelectedAdGroup(''); }}>
              <SelectTrigger>
                <SelectValue placeholder="Select campaign" />
              </SelectTrigger>
              <SelectContent>
                {campaigns
                  .filter(c => moveType === 'ad_group' ? c.id !== currentCampaignId : true)
                  .map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                      {c.campaign_type ? ` (${c.campaign_type})` : ''}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Ad Group selector (only for ad moves) */}
          {moveType === 'ad' && selectedCampaign && (
            <div className="space-y-sm">
              <Label>Target Ad Group *</Label>
              <Select value={selectedAdGroup} onValueChange={setSelectedAdGroup}>
                <SelectTrigger>
                  <SelectValue placeholder="Select ad group" />
                </SelectTrigger>
                <SelectContent>
                  {adGroups
                    .filter(ag => ag.id !== currentAdGroupId)
                    .map(ag => (
                      <SelectItem key={ag.id} value={ag.id}>{ag.name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isMoving}>Cancel</Button>
          <Button
            onClick={handleMove}
            disabled={isMoving || (moveType === 'ad_group' ? !selectedCampaign : !selectedAdGroup)}
          >
            {isMoving && <Loader2 className="w-4 h-4 mr-xs animate-spin" />}
            Move
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}