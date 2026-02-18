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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

type BulkMoveType = 'ad_groups' | 'ads';
type BulkActionMode = 'move' | 'copy';

interface BulkMoveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moveType: BulkMoveType;
  itemIds: string[];
  currentEntity?: string;
  onSuccess?: () => void;
  defaultMode?: BulkActionMode;
}

export function BulkMoveDialog({
  open,
  onOpenChange,
  moveType,
  itemIds,
  currentEntity,
  onSuccess,
  defaultMode = 'move',
}: BulkMoveDialogProps) {
  const queryClient = useQueryClient();
  const { data: systemEntities = [] } = useSystemEntities();
  const [mode, setMode] = useState<BulkActionMode>(defaultMode);
  const [selectedEntity, setSelectedEntity] = useState(currentEntity || '');
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [selectedAdGroup, setSelectedAdGroup] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch campaigns for selected entity
  const { data: campaigns = [] } = useQuery({
    queryKey: ['bulk-move-campaigns', selectedEntity],
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
    queryKey: ['bulk-move-ad-groups', selectedCampaign],
    queryFn: async () => {
      const { data } = await supabase
        .from('ad_groups')
        .select('id, name')
        .eq('campaign_id', selectedCampaign)
        .order('name');
      return data || [];
    },
    enabled: open && moveType === 'ads' && !!selectedCampaign,
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['search-campaigns-hierarchy'] });
    queryClient.invalidateQueries({ queryKey: ['ad-groups-hierarchy'] });
    queryClient.invalidateQueries({ queryKey: ['ads-hierarchy'] });
  };

  const handleAction = async () => {
    setIsProcessing(true);
    try {
      if (mode === 'move') {
        await handleMove();
      } else {
        await handleCopy();
      }
      invalidateAll();
      onSuccess?.();
      onOpenChange(false);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : `Failed to ${mode} items`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMove = async () => {
    if (moveType === 'ad_groups') {
      if (!selectedCampaign) {
        toast.error('Please select a target campaign');
        return;
      }
      const { error } = await supabase
        .from('ad_groups')
        .update({ campaign_id: selectedCampaign })
        .in('id', itemIds);
      if (error) throw error;
      toast.success(`Moved ${itemIds.length} ad group(s) to new campaign`);
    } else {
      if (!selectedAdGroup) {
        toast.error('Please select a target ad group');
        return;
      }
      const { error } = await supabase
        .from('ads')
        .update({ ad_group_id: selectedAdGroup })
        .in('id', itemIds);
      if (error) throw error;
      toast.success(`Moved ${itemIds.length} ad(s) to new ad group`);
    }
  };

  const handleCopy = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    if (moveType === 'ad_groups') {
      if (!selectedCampaign) {
        toast.error('Please select a target campaign');
        return;
      }
      // Fetch full ad group data + their ads
      const { data: sourceGroups } = await supabase
        .from('ad_groups')
        .select('*')
        .in('id', itemIds);
      if (!sourceGroups) throw new Error('Failed to fetch ad groups');

      for (const ag of sourceGroups) {
        const agRec = ag as Record<string, unknown>;
        const { data: newAg, error: agErr } = await supabase.from('ad_groups').insert({
          name: `${ag.name} (Copy)`,
          campaign_id: selectedCampaign,
          bidding_strategy: agRec.bidding_strategy as string | null ?? null,
          keywords: agRec.keywords as null ?? null,
          match_types: agRec.match_types as null ?? null,
          status: agRec.status as string | null ?? null,
          targeting_method: agRec.targeting_method as string | null ?? null,
          app_platform: agRec.app_platform as string | null ?? null,
          app_subtype: agRec.app_subtype as string | null ?? null,
        }).select().single();
        if (agErr) throw agErr;

        // Copy child ads
        const { data: childAds } = await supabase
          .from('ads')
          .select('*')
          .eq('ad_group_id', ag.id);
        if (childAds && childAds.length > 0) {
          for (const ad of childAds) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const adRec = ad as any;
            await supabase.from('ads').insert({
              name: `${ad.name} (Copy)`,
              ad_group_id: newAg.id,
              created_by: user.id,
              ad_type: adRec.ad_type ?? null,
              headlines: adRec.headlines ?? [],
              descriptions: adRec.descriptions ?? [],
              sitelinks: adRec.sitelinks ?? [],
              callouts: adRec.callouts ?? [],
              landing_page: adRec.landing_page ?? null,
              business_name: adRec.business_name ?? null,
              language: adRec.language ?? null,
              entity: adRec.entity ?? null,
              long_headline: adRec.long_headline ?? null,
              short_headlines: adRec.short_headlines ?? null,
              cta_text: adRec.cta_text ?? null,
              approval_status: 'draft',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any);
          }
        }
      }
      toast.success(`Copied ${itemIds.length} ad group(s) to target campaign`);
    } else {
      if (!selectedAdGroup) {
        toast.error('Please select a target ad group');
        return;
      }
      // Fetch full ad data
      const { data: sourceAds } = await supabase
        .from('ads')
        .select('*')
        .in('id', itemIds);
      if (!sourceAds) throw new Error('Failed to fetch ads');

      for (const ad of sourceAds) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const adRec = ad as any;
        await supabase.from('ads').insert({
          name: `${ad.name} (Copy)`,
          ad_group_id: selectedAdGroup,
          created_by: user.id,
          ad_type: adRec.ad_type ?? null,
          headlines: adRec.headlines ?? [],
          descriptions: adRec.descriptions ?? [],
          sitelinks: adRec.sitelinks ?? [],
          callouts: adRec.callouts ?? [],
          landing_page: adRec.landing_page ?? null,
          business_name: adRec.business_name ?? null,
          language: adRec.language ?? null,
          entity: adRec.entity ?? null,
          long_headline: adRec.long_headline ?? null,
          short_headlines: adRec.short_headlines ?? null,
          cta_text: adRec.cta_text ?? null,
          approval_status: 'draft',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);
      }
      toast.success(`Copied ${itemIds.length} ad(s) to target ad group`);
    }
  };

  const isMoveMode = mode === 'move';
  const actionLabel = isMoveMode ? 'Move' : 'Copy';

  const title = moveType === 'ad_groups'
    ? `${actionLabel} ${itemIds.length} Ad Group(s)`
    : `${actionLabel} ${itemIds.length} Ad(s)`;

  const description = moveType === 'ad_groups'
    ? `Select a target campaign to ${mode} the selected ad groups ${isMoveMode ? 'into' : 'to'}.${!isMoveMode ? ' Child ads will be duplicated.' : ''}`
    : `Select a target ad group to ${mode} the selected ads ${isMoveMode ? 'into' : 'to'}.`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-md py-md">
          {/* Mode toggle */}
          <div className="space-y-sm">
            <Label>Action</Label>
            <Tabs value={mode} onValueChange={(v) => setMode(v as BulkActionMode)}>
              <TabsList className="w-full">
                <TabsTrigger value="move" className="flex-1">Move</TabsTrigger>
                <TabsTrigger value="copy" className="flex-1">Copy (Duplicate)</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

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
            <Label>Target Campaign{moveType === 'ad_groups' ? ' *' : ''}</Label>
            <Select value={selectedCampaign} onValueChange={(v) => { setSelectedCampaign(v); setSelectedAdGroup(''); }}>
              <SelectTrigger>
                <SelectValue placeholder="Select campaign" />
              </SelectTrigger>
              <SelectContent>
                {campaigns.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                    {c.campaign_type ? ` (${c.campaign_type})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Ad Group selector (only for ad moves/copies) */}
          {moveType === 'ads' && selectedCampaign && (
            <div className="space-y-sm">
              <Label>Target Ad Group *</Label>
              <Select value={selectedAdGroup} onValueChange={setSelectedAdGroup}>
                <SelectTrigger>
                  <SelectValue placeholder="Select ad group" />
                </SelectTrigger>
                <SelectContent>
                  {adGroups.map(ag => (
                    <SelectItem key={ag.id} value={ag.id}>{ag.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing}>Cancel</Button>
          <Button
            onClick={handleAction}
            disabled={isProcessing || (moveType === 'ad_groups' ? !selectedCampaign : !selectedAdGroup)}
          >
            {isProcessing && <Loader2 className="w-4 h-4 mr-xs animate-spin" />}
            {actionLabel} {itemIds.length} Item(s)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
