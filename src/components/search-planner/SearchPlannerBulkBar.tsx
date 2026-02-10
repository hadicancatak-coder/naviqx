import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Download, Copy, Trash2, Loader2, Pause, Layers } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface CampaignData {
  id: string;
  name: string;
  entity?: string;
  status?: string;
  languages?: string[];
  campaign_type?: string;
  [key: string]: unknown;
}

interface AdGroupData {
  id: string;
  name: string;
  campaign_id: string;
  [key: string]: unknown;
}

interface AdData {
  id?: string;
  name: string;
  ad_group_id?: string | null;
  [key: string]: unknown;
}

interface SearchPlannerBulkBarProps {
  selectedCampaignIds: Set<string>;
  campaigns: CampaignData[];
  adGroups: AdGroupData[];
  ads: AdData[];
  onClearSelection: () => void;
  onRefresh: () => void;
}

export function SearchPlannerBulkBar({
  selectedCampaignIds,
  campaigns,
  adGroups,
  ads,
  onClearSelection,
  onRefresh,
}: SearchPlannerBulkBarProps) {
  const queryClient = useQueryClient();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);

  const selectedCount = selectedCampaignIds.size;
  if (selectedCount === 0) return null;

  const selectedIds = Array.from(selectedCampaignIds);
  const affectedAdGroups = adGroups.filter(ag => selectedIds.includes(ag.campaign_id));
  const affectedAdGroupIds = new Set(affectedAdGroups.map(ag => ag.id));
  const affectedAds = ads.filter(ad => ad.ad_group_id && affectedAdGroupIds.has(ad.ad_group_id));

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['search-campaigns-hierarchy'] });
    queryClient.invalidateQueries({ queryKey: ['ad-groups-hierarchy'] });
    queryClient.invalidateQueries({ queryKey: ['ads-hierarchy'] });
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('search_campaigns')
        .delete()
        .in('id', selectedIds);
      if (error) throw error;
      toast.success(`Deleted ${selectedCount} campaign(s)`);
      onClearSelection();
      invalidateAll();
      onRefresh();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete campaigns');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleDuplicate = async () => {
    setIsDuplicating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      let duplicated = 0;

      for (const campaignId of selectedIds) {
        const campaign = campaigns.find(c => c.id === campaignId);
        if (!campaign) continue;

        const { data: newCampaign, error: campErr } = await supabase
          .from('search_campaigns')
          .insert({
            name: `${campaign.name} (Copy)`,
            entity: campaign.entity,
            status: campaign.status || 'active',
            languages: campaign.languages,
            campaign_type: campaign.campaign_type || 'search',
            created_by: user.id,
          })
          .select()
          .single();
        if (campErr) throw campErr;

        const campAdGroups = adGroups.filter(ag => ag.campaign_id === campaignId);
        const adGroupMap = new Map<string, string>();

        for (const ag of campAdGroups) {
          const { data: newAg, error: agErr } = await supabase
            .from('ad_groups')
            .insert({
              name: ag.name,
              campaign_id: newCampaign.id,
              bidding_strategy: (ag as Record<string, unknown>).bidding_strategy as string | null ?? null,
              keywords: (ag as Record<string, unknown>).keywords as null ?? null,
              match_types: (ag as Record<string, unknown>).match_types as null ?? null,
              status: (ag as Record<string, unknown>).status as string | null ?? null,
            })
            .select()
            .single();
          if (agErr) throw agErr;
          adGroupMap.set(ag.id, newAg.id);
        }

        if (adGroupMap.size > 0) {
          const campAds = ads.filter(ad => ad.ad_group_id && adGroupMap.has(ad.ad_group_id));
          for (const ad of campAds) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const adRecord = ad as any;
            const { error: adErr } = await supabase.from('ads').insert({
              name: `${ad.name} (Copy)`,
              ad_group_id: adGroupMap.get(ad.ad_group_id as string),
              created_by: user.id,
              ad_type: adRecord.ad_type ?? null,
              headlines: adRecord.headlines ?? [],
              descriptions: adRecord.descriptions ?? [],
              sitelinks: adRecord.sitelinks ?? [],
              callouts: adRecord.callouts ?? [],
              landing_page: adRecord.landing_page ?? null,
              business_name: adRecord.business_name ?? null,
              language: adRecord.language ?? null,
              entity: adRecord.entity ?? null,
              long_headline: adRecord.long_headline ?? null,
              short_headlines: adRecord.short_headlines ?? null,
              cta_text: adRecord.cta_text ?? null,
              approval_status: 'draft',
            });
            if (adErr) throw adErr;
          }
        }
        duplicated++;
      }

      toast.success(`Duplicated ${duplicated} campaign(s)`);
      onClearSelection();
      invalidateAll();
      onRefresh();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to duplicate campaigns');
    } finally {
      setIsDuplicating(false);
    }
  };

  const handleExport = () => {
    const exportData = selectedIds.map(campaignId => {
      const campaign = campaigns.find(c => c.id === campaignId);
      if (!campaign) return null;
      const campAdGroups = adGroups.filter(ag => ag.campaign_id === campaignId);
      return {
        ...campaign,
        ad_groups: campAdGroups.map(ag => ({
          ...ag,
          ads: ads.filter(ad => ad.ad_group_id === ag.id),
        })),
      };
    }).filter(Boolean);

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `campaigns-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported campaigns');
  };

  const handleChangeStatus = async (status: string) => {
    try {
      const { error } = await supabase
        .from('search_campaigns')
        .update({ status })
        .in('id', selectedIds);
      if (error) throw error;
      toast.success(`Updated ${selectedCount} campaign(s) to "${status}"`);
      invalidateAll();
      onRefresh();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to update status');
    }
  };

  const handlePauseAll = async () => {
    await handleChangeStatus('paused');
  };

  const handleChangeType = async (type: string) => {
    try {
      const { error } = await supabase
        .from('search_campaigns')
        .update({ campaign_type: type })
        .in('id', selectedIds);
      if (error) throw error;
      toast.success(`Changed ${selectedCount} campaign(s) to "${type}"`);
      invalidateAll();
      onRefresh();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to change type');
    }
  };

  return (
    <div className="fixed bottom-md left-1/2 -translate-x-1/2 z-overlay">
      <div className="liquid-glass-elevated rounded-xl shadow-lg p-md flex items-center gap-md border border-border">
        {/* Selection info */}
        <div className="flex items-center gap-sm">
          <Badge variant="default" className="bg-primary text-primary-foreground text-body-sm font-semibold px-sm">
            {selectedCount}
          </Badge>
          <div className="flex flex-col">
            <span className="text-body-sm font-semibold text-foreground">selected</span>
            <span className="text-metadata text-muted-foreground">
              {affectedAdGroups.length} ad groups · {affectedAds.length} ads
            </span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={onClearSelection}
            className="text-muted-foreground hover:text-foreground h-7 w-7 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="h-8 w-px bg-border" />

        {/* Actions */}
        <div className="flex items-center gap-sm">
          <Button size="sm" variant="secondary" onClick={handlePauseAll} className="transition-smooth">
            <Pause className="w-4 h-4 mr-xs" />
            Pause All
          </Button>

          <Select onValueChange={handleChangeStatus}>
            <SelectTrigger className="w-32 h-8 text-body-sm">
              <SelectValue placeholder="Status..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
            </SelectContent>
          </Select>

          <Select onValueChange={handleChangeType}>
            <SelectTrigger className="w-32 h-8 text-body-sm">
              <SelectValue placeholder="Type..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="search">Search</SelectItem>
              <SelectItem value="display">Display</SelectItem>
              <SelectItem value="app">App</SelectItem>
            </SelectContent>
          </Select>

          <Button size="sm" variant="secondary" onClick={handleExport} className="transition-smooth">
            <Download className="w-4 h-4 mr-xs" />
            Export
          </Button>

          <Button size="sm" variant="secondary" onClick={handleDuplicate} disabled={isDuplicating} className="transition-smooth">
            {isDuplicating ? <Loader2 className="w-4 h-4 mr-xs animate-spin" /> : <Copy className="w-4 h-4 mr-xs" />}
            Duplicate
          </Button>

          <Button
            size="sm"
            variant="destructive"
            onClick={() => setShowDeleteConfirm(true)}
            className="transition-smooth"
          >
            <Trash2 className="w-4 h-4 mr-xs" />
            Delete
          </Button>
        </div>
      </div>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="z-overlay">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedCount} campaign(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedCount} campaign(s), {affectedAdGroups.length} ad group(s), and {affectedAds.length} ad(s). This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? <Loader2 className="w-4 h-4 mr-xs animate-spin" /> : null}
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
