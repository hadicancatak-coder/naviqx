import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  ChevronRight, 
  ChevronDown, 
  Plus, 
  Folder, 
  FileText, 
  Trash2, 
  Copy, 
  Edit, 
  Search,
  MoreHorizontal,
  Archive,
  FolderPlus
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { calculateAdStrength } from "@/lib/adQualityScore";
import { ENTITIES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Import dialogs
import { CreateCampaignDialog } from "@/components/ads/CreateCampaignDialog";
import { DeleteAdDialog } from "@/components/search/DeleteAdDialog";
import { DeleteAdGroupDialog } from "@/components/search/DeleteAdGroupDialog";
import { DeleteCampaignDialog } from "@/components/search/DeleteCampaignDialog";
import { DuplicateAdDialog } from "@/components/search/DuplicateAdDialog";
import { DuplicateAdGroupDialog } from "@/components/search/DuplicateAdGroupDialog";
import { DuplicateCampaignDialog } from "@/components/search/DuplicateCampaignDialog";

// Local type definitions for this component
interface SitelinkData {
  description?: string;
  text?: string;
  link?: string;
}

interface CalloutData {
  text?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface AdData {
  id?: string;
  name: string;
  ad_group_id?: string | null;
  ad_group_name?: string;
  campaign_name?: string;
  entity?: string;
  ad_type?: string;
  // These are Json from Supabase, so we use any to allow compatibility
  headlines: string[] | unknown;
  descriptions: string[] | unknown;
  sitelinks: { description: string; link: string }[] | unknown;
  callouts: string[] | unknown;
  landing_page: string;
  business_name: string;
  language?: string;
  approval_status?: string;
  [key: string]: unknown;
}

interface AdGroupData {
  id: string;
  name: string;
  campaign_id: string;
}

interface CampaignData {
  id: string;
  name: string;
  entity?: string;
}

interface SearchPlannerStructurePanelProps {
  onEditAd: (ad: AdData, adGroup: AdGroupData, campaign: CampaignData, entity: string) => void;
  onCreateAd: (adGroup: AdGroupData, campaign: CampaignData, entity: string) => void;
  onCampaignClick?: (campaign: CampaignData, entity: string) => void;
  adType?: "search" | "display";
}

interface DeleteAdDialogState { ad: AdData }
interface DeleteAdGroupDialogState { adGroup: AdGroupData; adsCount: number }
interface DeleteCampaignDialogState { campaign: CampaignData; adGroupsCount: number; adsCount: number }
interface DuplicateAdDialogState { ad: AdData }
interface DuplicateAdGroupDialogState { adGroup: AdGroupData; adsCount: number }
interface DuplicateCampaignDialogState { campaign: CampaignData; adGroupsCount: number; adsCount: number }

export function SearchPlannerStructurePanel({
  onEditAd,
  onCreateAd,
  onCampaignClick,
  adType = "search",
}: SearchPlannerStructurePanelProps) {
  const queryClient = useQueryClient();
  const [selectedEntity, setSelectedEntity] = useState<string>("UAE");
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set());
  const [expandedAdGroups, setExpandedAdGroups] = useState<Set<string>>(new Set());
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);
  const [showCreateAdGroup, setShowCreateAdGroup] = useState<{campaignId: string; campaignName: string} | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Delete dialogs
  const [deleteAdDialog, setDeleteAdDialog] = useState<DeleteAdDialogState | null>(null);
  const [deleteAdGroupDialog, setDeleteAdGroupDialog] = useState<DeleteAdGroupDialogState | null>(null);
  const [deleteCampaignDialog, setDeleteCampaignDialog] = useState<DeleteCampaignDialogState | null>(null);

  // Duplicate dialogs
  const [duplicateAdDialog, setDuplicateAdDialog] = useState<DuplicateAdDialogState | null>(null);
  const [duplicateAdGroupDialog, setDuplicateAdGroupDialog] = useState<DuplicateAdGroupDialogState | null>(null);
  const [duplicateCampaignDialog, setDuplicateCampaignDialog] = useState<DuplicateCampaignDialogState | null>(null);

  // Fetch campaigns for selected entity
  const { data: campaigns = [] } = useQuery({
    queryKey: ['search-campaigns-hierarchy', selectedEntity, adType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('search_campaigns')
        .select('*')
        .eq('entity', selectedEntity)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedEntity
  });

  // Fetch all ad groups
  const { data: adGroups = [] } = useQuery({
    queryKey: ['ad-groups-hierarchy'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ad_groups')
        .select('*')
        .order('name');
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch all ads
  const { data: ads = [] } = useQuery({
    queryKey: ['ads-hierarchy', adType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ads')
        .select('*')
        .eq('ad_type', adType)
        .order('name');
      if (error) throw error;
      return data || [];
    }
  });

  const toggleCampaign = (campaignId: string) => {
    setExpandedCampaigns(prev => {
      const next = new Set(prev);
      if (next.has(campaignId)) {
        next.delete(campaignId);
      } else {
        next.add(campaignId);
      }
      return next;
    });
  };

  const toggleAdGroup = (adGroupId: string) => {
    setExpandedAdGroups(prev => {
      const next = new Set(prev);
      if (next.has(adGroupId)) {
        next.delete(adGroupId);
      } else {
        next.add(adGroupId);
      }
      return next;
    });
  };

  // Filter campaigns based on search
  const filteredCampaigns = useMemo(() => {
    if (!searchQuery) return campaigns;
    const query = searchQuery.toLowerCase();
    
    return campaigns.filter(campaign => {
      const matchesCampaign = campaign.name.toLowerCase().includes(query);
      const campaignAdGroups = adGroups.filter(ag => ag.campaign_id === campaign.id);
      const matchesAdGroup = campaignAdGroups.some(ag => ag.name.toLowerCase().includes(query));
      const campaignAds = campaignAdGroups.flatMap(ag => ads.filter(ad => ad.ad_group_id === ag.id));
      const matchesAd = campaignAds.some(ad => ad.name.toLowerCase().includes(query));
      
      return matchesCampaign || matchesAdGroup || matchesAd;
    });
  }, [campaigns, adGroups, ads, searchQuery]);

  const getAdGroupsForCampaign = (campaignId: string) => {
    return adGroups.filter(ag => ag.campaign_id === campaignId);
  };

  const getAdsForAdGroup = (adGroupId: string) => {
    return ads.filter(ad => ad.ad_group_id === adGroupId);
  };

  const getTotalAdsForCampaign = (campaignId: string) => {
    const campaignAdGroups = getAdGroupsForCampaign(campaignId);
    return ads.filter(ad => campaignAdGroups.some(ag => ag.id === ad.ad_group_id)).length;
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['campaigns-hierarchy'] });
    queryClient.invalidateQueries({ queryKey: ['ad-groups-hierarchy'] });
    queryClient.invalidateQueries({ queryKey: ['ads-hierarchy'] });
  };

  const getAdStrengthColor = (score: number) => {
    if (score >= 80) return "text-success";
    if (score >= 60) return "text-warning";
    return "text-destructive";
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-md border-b border-border/50 space-y-sm">
        {/* Entity Selector */}
        <div className="space-y-xs">
          <label className="text-metadata font-medium text-muted-foreground uppercase tracking-wide">
            Entity
          </label>
          <Select value={selectedEntity} onValueChange={setSelectedEntity}>
            <SelectTrigger className="h-9 bg-white/10 border-white/20 transition-smooth">
              <SelectValue placeholder="Select entity" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border shadow-lg">
              {ENTITIES.map(entity => (
                <SelectItem 
                  key={entity} 
                  value={entity}
                  className="hover:bg-card-hover transition-smooth"
                >
                  {entity}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* New Campaign Button */}
        <Button 
          onClick={() => setShowCreateCampaign(true)} 
          className="w-full h-9 gap-xs transition-smooth"
        >
          <Plus className="h-4 w-4" />
          <span className="text-body-sm">New Campaign</span>
        </Button>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-sm top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search campaigns, ads..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 pl-9 bg-white/10 border-white/20 transition-smooth"
          />
        </div>
      </div>

      {/* Tree View */}
      <ScrollArea className="flex-1">
        <div className="p-sm space-y-xs">
          {filteredCampaigns.length === 0 ? (
            <div className="text-center py-lg text-muted-foreground">
              <Folder className="h-10 w-10 mx-auto mb-sm opacity-40" />
              <p className="text-body-sm">
                {searchQuery ? 'No matching results' : 'No campaigns yet'}
              </p>
              <p className="text-metadata">
                {searchQuery ? 'Try a different search' : 'Create one to get started'}
              </p>
            </div>
          ) : (
            filteredCampaigns.map(campaign => {
              const campaignAdGroups = getAdGroupsForCampaign(campaign.id);
              const isExpanded = expandedCampaigns.has(campaign.id);
              const totalAds = getTotalAdsForCampaign(campaign.id);

                return (
                <Collapsible key={campaign.id} open={isExpanded}>
                  {/* Campaign Row - entire row clickable for expand/collapse */}
                  <div 
                    className={cn(
                      "group flex items-center gap-xs p-sm rounded-lg transition-smooth cursor-pointer",
                      "hover:bg-card-hover border border-transparent hover:border-border active:scale-[0.99]"
                    )}
                    onClick={() => toggleCampaign(campaign.id)}
                  >
                    {/* Chevron indicator */}
                    <div className="p-xs">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>

                    {/* Campaign name */}
                    <div className="flex items-center gap-xs flex-1 min-w-0">
                      <Folder className="h-4 w-4 text-primary/70 flex-shrink-0" />
                      <span className="flex-1 text-body-sm font-medium text-foreground break-words line-clamp-2">
                        {campaign.name}
                      </span>
                    </div>

                    {/* Campaign Stats */}
                    <Badge variant="secondary" className="text-metadata bg-muted">
                      {campaignAdGroups.length} groups
                    </Badge>

                    {/* Campaign Actions */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          className="opacity-0 group-hover:opacity-100 transition-smooth"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="text-muted-foreground" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-card border-border shadow-lg">
                        <DropdownMenuItem
                          onClick={() => setShowCreateAdGroup({ campaignId: campaign.id, campaignName: campaign.name })}
                          className="gap-xs hover:bg-card-hover"
                        >
                          <FolderPlus className="h-4 w-4" />
                          <span className="text-body-sm">Add Ad Group</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDuplicateCampaignDialog({ 
                            campaign, 
                            adGroupsCount: campaignAdGroups.length, 
                            adsCount: totalAds 
                          })}
                          className="gap-xs hover:bg-card-hover"
                        >
                          <Copy className="h-4 w-4" />
                          <span className="text-body-sm">Duplicate</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setDeleteCampaignDialog({ 
                            campaign, 
                            adGroupsCount: campaignAdGroups.length, 
                            adsCount: totalAds 
                          })}
                          className="gap-xs text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="text-body-sm">Delete</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Ad Groups */}
                  <CollapsibleContent>
                    <div className="ml-md pl-sm border-l border-border space-y-xs mt-xs">
                      {campaignAdGroups.length === 0 ? (
                        <div className="text-metadata text-muted-foreground py-sm px-sm">
                          No ad groups yet
                        </div>
                      ) : (
                        campaignAdGroups.map(adGroup => {
                          const adGroupAds = getAdsForAdGroup(adGroup.id);
                          const isAdGroupExpanded = expandedAdGroups.has(adGroup.id);

                          return (
                            <Collapsible key={adGroup.id} open={isAdGroupExpanded}>
                              {/* Ad Group Row - entire row is clickable for expand/collapse */}
                              <div 
                                className={cn(
                                  "group flex items-center gap-xs p-sm rounded-lg transition-smooth cursor-pointer",
                                  "hover:bg-card-hover active:scale-[0.99]"
                                )}
                                onClick={() => toggleAdGroup(adGroup.id)}
                              >
                                {/* Chevron indicator */}
                                <div className="p-xs">
                                  {isAdGroupExpanded ? (
                                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                                  ) : (
                                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                                  )}
                                </div>

                                {/* Ad Group name */}
                                <div className="flex items-center gap-xs flex-1 min-w-0">
                                  <Folder className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                  <span className="flex-1 text-body-sm text-foreground break-words line-clamp-2">
                                    {adGroup.name}
                                  </span>
                                </div>

                                <Badge variant="outline" className="text-metadata">
                                  {adGroupAds.length} ads
                                </Badge>

                                {/* Ad Group Actions */}
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-smooth"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="bg-card border-border shadow-lg">
                                    <DropdownMenuItem
                                      onClick={() => onCreateAd(adGroup, campaign, selectedEntity)}
                                      className="gap-xs hover:bg-card-hover"
                                    >
                                      <Plus className="h-4 w-4" />
                                      <span className="text-body-sm">New Ad</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => setDuplicateAdGroupDialog({ adGroup, adsCount: adGroupAds.length })}
                                      className="gap-xs hover:bg-card-hover"
                                    >
                                      <Copy className="h-4 w-4" />
                                      <span className="text-body-sm">Duplicate</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => setDeleteAdGroupDialog({ adGroup, adsCount: adGroupAds.length })}
                                      className="gap-xs text-destructive hover:bg-destructive/10"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                      <span className="text-body-sm">Delete</span>
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>

                              {/* Ads */}
                              <CollapsibleContent>
                                <div className="ml-md pl-sm border-l border-border/50 space-y-xs mt-xs">
                                  {adGroupAds.map(ad => {
                                        const headlinesArr = Array.isArray(ad.headlines) ? ad.headlines as string[] : [];
                                    const descriptionsArr = Array.isArray(ad.descriptions) ? ad.descriptions as string[] : [];
                                    const sitelinksArr = Array.isArray(ad.sitelinks) ? (ad.sitelinks as SitelinkData[]).map((s) => s?.description || s?.text || '') : [];
                                    const calloutsArr = Array.isArray(ad.callouts) ? (ad.callouts as (CalloutData | string)[]).map((c) => typeof c === 'string' ? c : c?.text || '') : [];
                                    const strengthResult = calculateAdStrength(headlinesArr, descriptionsArr, sitelinksArr, calloutsArr);
                                    const strength = typeof strengthResult === 'number' ? strengthResult : strengthResult.score;

                                    return (
                                      <button
                                        key={ad.id}
                                        className={cn(
                                          "group flex items-center gap-xs p-sm rounded-lg transition-smooth cursor-pointer w-full text-left",
                                          "hover:bg-card-hover active:scale-[0.99]"
                                        )}
                                        onClick={() => onEditAd(ad, adGroup, campaign, selectedEntity)}
                                      >
                                        <FileText className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                        <span className="flex-1 text-body-sm text-foreground break-words line-clamp-2 min-w-0">
                                          {ad.name}
                                        </span>
                                        <Badge variant="outline" className={cn("text-metadata", getAdStrengthColor(strength))}>
                                          {strength}%
                                        </Badge>

                                        {/* Ad Actions */}
                                        <div 
                                          className="flex items-center gap-xs opacity-0 group-hover:opacity-100 transition-smooth"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 active:scale-95"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setDuplicateAdDialog({ ad });
                                            }}
                                          >
                                            <Copy className="h-3 w-3 text-muted-foreground" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 hover:bg-destructive/10 active:scale-95"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setDeleteAdDialog({ ad });
                                            }}
                                          >
                                            <Trash2 className="h-3 w-3 text-destructive" />
                                          </Button>
                                        </div>
                                      </button>
                                    );
                                  })}

                                  {/* Add Ad Button */}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full justify-start gap-xs text-muted-foreground hover:text-primary"
                                    onClick={() => onCreateAd(adGroup, campaign, selectedEntity)}
                                  >
                                    <Plus className="h-3.5 w-3.5" />
                                    <span className="text-metadata">Add Ad</span>
                                  </Button>
                                </div>
                              </CollapsibleContent>
                            </Collapsible>
                          );
                        })
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Dialogs */}
      <CreateCampaignDialog
        open={showCreateCampaign}
        onOpenChange={setShowCreateCampaign}
        defaultEntity={selectedEntity}
        onSuccess={handleRefresh}
      />

      {deleteAdDialog && (
        <DeleteAdDialog
          ad={deleteAdDialog.ad}
          open={!!deleteAdDialog}
          onOpenChange={(open) => !open && setDeleteAdDialog(null)}
          onSuccess={handleRefresh}
        />
      )}

      {deleteAdGroupDialog && (
        <DeleteAdGroupDialog
          adGroup={deleteAdGroupDialog.adGroup}
          adsCount={deleteAdGroupDialog.adsCount}
          open={!!deleteAdGroupDialog}
          onOpenChange={(open) => !open && setDeleteAdGroupDialog(null)}
          onSuccess={handleRefresh}
        />
      )}

      {deleteCampaignDialog && (
        <DeleteCampaignDialog
          campaign={deleteCampaignDialog.campaign}
          adGroupsCount={deleteCampaignDialog.adGroupsCount}
          adsCount={deleteCampaignDialog.adsCount}
          open={!!deleteCampaignDialog}
          onOpenChange={(open) => !open && setDeleteCampaignDialog(null)}
          onSuccess={handleRefresh}
        />
      )}

      {duplicateAdDialog && (
        <DuplicateAdDialog
          ad={duplicateAdDialog.ad}
          open={!!duplicateAdDialog}
          onOpenChange={(open) => !open && setDuplicateAdDialog(null)}
          onSuccess={handleRefresh}
        />
      )}

      {duplicateAdGroupDialog && (
        <DuplicateAdGroupDialog
          adGroup={duplicateAdGroupDialog.adGroup}
          adsCount={duplicateAdGroupDialog.adsCount}
          open={!!duplicateAdGroupDialog}
          onOpenChange={(open) => !open && setDuplicateAdGroupDialog(null)}
          onSuccess={handleRefresh}
        />
      )}

      {duplicateCampaignDialog && (
        <DuplicateCampaignDialog
          campaign={duplicateCampaignDialog.campaign}
          adGroupsCount={duplicateCampaignDialog.adGroupsCount}
          adsCount={duplicateCampaignDialog.adsCount}
          open={!!duplicateCampaignDialog}
          onOpenChange={(open) => !open && setDuplicateCampaignDialog(null)}
          onSuccess={handleRefresh}
        />
      )}
    </div>
  );
}
