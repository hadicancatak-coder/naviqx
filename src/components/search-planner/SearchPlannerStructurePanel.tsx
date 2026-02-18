import { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  ChevronRight, 
  ChevronDown, 
  Plus, 
  Folder, 
  FileText, 
  Trash2, 
  Copy, 
  Search,
  MoreHorizontal,
  FolderPlus,
  CheckSquare,
  Monitor,
  Smartphone,
  ArrowRightLeft,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { calculateAdStrength } from "@/lib/adQualityScore";
import { validateCampaign } from "@/lib/campaignValidation";
import { useSystemEntities } from "@/hooks/useSystemEntities";
import { cn } from "@/lib/utils";

// Import dialogs
import { CreateCampaignDialog } from "@/components/ads/CreateCampaignDialog";
import { CreateAdGroupDialog } from "@/components/ads/CreateAdGroupDialog";
import { DeleteAdDialog } from "@/components/search/DeleteAdDialog";
import { DeleteAdGroupDialog } from "@/components/search/DeleteAdGroupDialog";
import { DeleteCampaignDialog } from "@/components/search/DeleteCampaignDialog";
import { DuplicateAdDialog } from "@/components/search/DuplicateAdDialog";
import { DuplicateAdGroupDialog } from "@/components/search/DuplicateAdGroupDialog";
import { DuplicateCampaignDialog } from "@/components/search/DuplicateCampaignDialog";
import { SearchPlannerBulkBar } from "./SearchPlannerBulkBar";
import { MoveItemDialog } from "./MoveItemDialog";
import { BulkMoveDialog } from "./BulkMoveDialog";

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
  campaign_type?: string;
  status?: string;
  languages?: string[];
}

type CampaignTypeFilter = 'all' | 'search' | 'display' | 'app';

const CAMPAIGN_TYPE_FILTERS: { value: CampaignTypeFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'search', label: 'Search' },
  { value: 'display', label: 'Display' },
  { value: 'app', label: 'App' },
];

const CAMPAIGN_TYPE_BADGE_STYLES: Record<string, string> = {
  search: "bg-info-soft text-info-text",
  display: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  app: "bg-success-soft text-success-text",
};

const CAMPAIGN_TYPE_BORDER_COLORS: Record<string, string> = {
  search: "border-l-blue-500",
  display: "border-l-purple-500",
  app: "border-l-green-500",
};

interface SearchPlannerStructurePanelProps {
  onEditAd: (ad: AdData, adGroup: AdGroupData, campaign: CampaignData, entity: string) => void;
  onCreateAd: (adGroup: AdGroupData, campaign: CampaignData, entity: string) => void;
  onCampaignClick?: (campaign: CampaignData, entity: string) => void;
  onAdGroupClick?: (adGroup: AdGroupData, campaign: CampaignData, entity: string) => void;
}

interface DeleteAdDialogState { ad: AdData }
interface DeleteAdGroupDialogState { adGroup: AdGroupData; adsCount: number }
interface DeleteCampaignDialogState { campaign: CampaignData; adGroupsCount: number; adsCount: number }
interface DuplicateAdDialogState { ad: AdData }
interface DuplicateAdGroupDialogState { adGroup: AdGroupData; adsCount: number }
interface DuplicateCampaignDialogState { campaign: CampaignData; adGroupsCount: number; adsCount: number }
interface MoveAdGroupDialogState { adGroup: AdGroupData; campaignId: string; entity: string }
interface MoveAdDialogState { ad: AdData; adGroupId: string; campaignId: string; entity: string }
// eslint-disable-next-line react-refresh/only-export-components
function CampaignReadinessDot({ campaignId, campaignType, campaign, adGroups: campaignAdGroups, ads: allAds }: {
  campaignId: string;
  campaignType: string;
  campaign: CampaignData;
  adGroups: { id: string; name: string; keywords?: unknown; campaign_id: string }[];
  ads: AdData[];
}) {
  const groupsWithAds = useMemo(() => {
    return campaignAdGroups.map(ag => ({
      ...ag,
      ads: allAds.filter(a => a.ad_group_id === ag.id),
    }));
  }, [campaignAdGroups, allAds]);

  const validation = useMemo(() => {
    return validateCampaign(
      { ...campaign, campaign_type: campaignType },
      groupsWithAds
    );
  }, [campaign, campaignType, groupsWithAds]);

  return (
    <span
      className={cn(
        "h-2 w-2 rounded-full flex-shrink-0",
        validation.ready ? "bg-success" : "bg-destructive"
      )}
      title={validation.ready ? 'Ready' : validation.blocking[0] || 'Not ready'}
    />
  );
}


export function SearchPlannerStructurePanel({
  onEditAd,
  onCreateAd,
  onCampaignClick,
  onAdGroupClick,
}: SearchPlannerStructurePanelProps) {
  const queryClient = useQueryClient();
  const { data: systemEntities = [] } = useSystemEntities();
  const entityNames = useMemo(() => systemEntities.map(e => e.name), [systemEntities]);
  
  const [selectedEntity, setSelectedEntity] = useState<string>("");
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set());
  const [expandedAdGroups, setExpandedAdGroups] = useState<Set<string>>(new Set());
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);
  const [showCreateAdGroup, setShowCreateAdGroup] = useState<{campaignId: string; campaignName: string; campaignType: string} | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [campaignTypeFilter, setCampaignTypeFilter] = useState<CampaignTypeFilter>('all');
  
  // Selection mode
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<Set<string>>(new Set());
  const [selectedAdGroupIds, setSelectedAdGroupIds] = useState<Set<string>>(new Set());
  const [selectedAdIds, setSelectedAdIds] = useState<Set<string>>(new Set());

  // Bulk move dialogs
  const [bulkMoveAdGroups, setBulkMoveAdGroups] = useState(false);
  const [bulkMoveAds, setBulkMoveAds] = useState(false);
  
  // Set default entity when data loads
  useEffect(() => {
    if (entityNames.length > 0 && !selectedEntity) {
      setSelectedEntity(entityNames.includes("UAE") ? "UAE" : entityNames[0]);
    }
  }, [entityNames, selectedEntity]);

  // Delete dialogs
  const [deleteAdDialog, setDeleteAdDialog] = useState<DeleteAdDialogState | null>(null);
  const [deleteAdGroupDialog, setDeleteAdGroupDialog] = useState<DeleteAdGroupDialogState | null>(null);
  const [deleteCampaignDialog, setDeleteCampaignDialog] = useState<DeleteCampaignDialogState | null>(null);

  // Duplicate dialogs
  const [duplicateAdDialog, setDuplicateAdDialog] = useState<DuplicateAdDialogState | null>(null);
  const [duplicateAdGroupDialog, setDuplicateAdGroupDialog] = useState<DuplicateAdGroupDialogState | null>(null);
  const [duplicateCampaignDialog, setDuplicateCampaignDialog] = useState<DuplicateCampaignDialogState | null>(null);

  // Move dialogs
  const [moveAdGroupDialog, setMoveAdGroupDialog] = useState<MoveAdGroupDialogState | null>(null);
  const [moveAdDialog, setMoveAdDialog] = useState<MoveAdDialogState | null>(null);

  // Fetch campaigns for selected entity
  const { data: campaigns = [] } = useQuery({
    queryKey: ['search-campaigns-hierarchy', selectedEntity],
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
    queryKey: ['ads-hierarchy'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ads')
        .select('*')
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

  // Filter campaigns based on search + type
  const filteredCampaigns = useMemo(() => {
    let filtered = campaigns;
    
    // Type filter
    if (campaignTypeFilter !== 'all') {
      filtered = filtered.filter(c => (c.campaign_type || 'search') === campaignTypeFilter);
    }
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(campaign => {
        const matchesCampaign = campaign.name.toLowerCase().includes(query);
        const campaignAdGroups = adGroups.filter(ag => ag.campaign_id === campaign.id);
        const matchesAdGroup = campaignAdGroups.some(ag => ag.name.toLowerCase().includes(query));
        const campaignAds = campaignAdGroups.flatMap(ag => ads.filter(ad => ad.ad_group_id === ag.id));
        const matchesAd = campaignAds.some(ad => ad.name.toLowerCase().includes(query));
        return matchesCampaign || matchesAdGroup || matchesAd;
      });
    }
    
    return filtered;
  }, [campaigns, adGroups, ads, searchQuery, campaignTypeFilter]);

  // Campaign type counts (for filter pills)
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { all: campaigns.length, search: 0, display: 0, app: 0 };
    campaigns.forEach(c => {
      const type = (c.campaign_type || 'search') as string;
      if (type in counts) counts[type]++;
    });
    return counts;
  }, [campaigns]);

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
    queryClient.invalidateQueries({ queryKey: ['search-campaigns-hierarchy'] });
    queryClient.invalidateQueries({ queryKey: ['ad-groups-hierarchy'] });
    queryClient.invalidateQueries({ queryKey: ['ads-hierarchy'] });
  };

  const getAdStrengthColor = (score: number) => {
    if (score >= 80) return "text-success";
    if (score >= 60) return "text-warning";
    return "text-destructive";
  };

  // Selection handlers
  const toggleCampaignSelection = useCallback((campaignId: string) => {
    setSelectedCampaignIds(prev => {
      const next = new Set(prev);
      if (next.has(campaignId)) {
        next.delete(campaignId);
      } else {
        next.add(campaignId);
      }
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    const filteredIds = filteredCampaigns.map(c => c.id);
    const allSelected = filteredIds.every(id => selectedCampaignIds.has(id));
    
    if (allSelected) {
      setSelectedCampaignIds(new Set());
    } else {
      setSelectedCampaignIds(new Set(filteredIds));
    }
  }, [filteredCampaigns, selectedCampaignIds]);

  const handleClearSelection = useCallback(() => {
    setSelectedCampaignIds(new Set());
    setSelectedAdGroupIds(new Set());
    setSelectedAdIds(new Set());
    setSelectionMode(false);
  }, []);

  const toggleSelectionMode = useCallback(() => {
    setSelectionMode(prev => {
      if (prev) {
        setSelectedCampaignIds(new Set());
        setSelectedAdGroupIds(new Set());
        setSelectedAdIds(new Set());
      }
      return !prev;
    });
  }, []);

  const toggleAdGroupSelection = useCallback((adGroupId: string) => {
    setSelectedAdGroupIds(prev => {
      const next = new Set(prev);
      if (next.has(adGroupId)) next.delete(adGroupId);
      else next.add(adGroupId);
      return next;
    });
  }, []);

  const toggleAdSelection = useCallback((adId: string) => {
    setSelectedAdIds(prev => {
      const next = new Set(prev);
      if (next.has(adId)) next.delete(adId);
      else next.add(adId);
      return next;
    });
  }, []);

  const bulkSelectedAdGroupCount = selectedAdGroupIds.size;
  const bulkSelectedAdCount = selectedAdIds.size;

  // Determine the default campaign type for the create dialog
  const createDialogDefaultType = campaignTypeFilter !== 'all' ? campaignTypeFilter : undefined;

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
              {entityNames.map(entity => (
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

        {/* New Campaign + Selection Mode */}
        <div className="flex gap-xs">
          <Button 
            onClick={() => setShowCreateCampaign(true)} 
            className="flex-1 h-9 gap-xs transition-smooth"
          >
            <Plus className="h-4 w-4" />
            <span className="text-body-sm">New Campaign</span>
          </Button>
          <Button
            variant={selectionMode ? "secondary" : "outline"}
            size="icon"
            className="h-9 w-9 transition-smooth"
            onClick={toggleSelectionMode}
            title={selectionMode ? "Exit selection mode" : "Select campaigns"}
          >
            <CheckSquare className="h-4 w-4" />
          </Button>
        </div>

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

        {/* Campaign Type Filter Pills */}
        <div className="flex gap-xs flex-wrap">
          {CAMPAIGN_TYPE_FILTERS.map(filter => (
            <button
              key={filter.value}
              onClick={() => setCampaignTypeFilter(filter.value)}
              className={cn(
                "px-sm py-xs rounded-full text-metadata font-medium transition-smooth border",
                campaignTypeFilter === filter.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted text-muted-foreground border-transparent hover:bg-card-hover hover:text-foreground"
              )}
            >
              {filter.label} ({typeCounts[filter.value] || 0})
            </button>
          ))}
        </div>

        {/* Select All toggle when in selection mode */}
        {selectionMode && filteredCampaigns.length > 0 && (
          <div className="flex items-center gap-sm">
            <Checkbox
              checked={filteredCampaigns.length > 0 && filteredCampaigns.every(c => selectedCampaignIds.has(c.id))}
              onCheckedChange={toggleSelectAll}
            />
            <span className="text-metadata text-muted-foreground">
              {selectedCampaignIds.size > 0 
                ? `${selectedCampaignIds.size} selected` 
                : `Select all (${filteredCampaigns.length})`}
            </span>
          </div>
        )}
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
              const isSelected = selectedCampaignIds.has(campaign.id);
              const campaignTypeLabel = (campaign.campaign_type || 'search') as string;

                return (
                <Collapsible key={campaign.id} open={isExpanded}>
                  {/* Campaign Row */}
                  <div 
                    className={cn(
                      "group flex items-center gap-xs p-sm rounded-lg transition-smooth cursor-pointer",
                      "hover:bg-card-hover border border-transparent hover:border-border active:scale-[0.99]",
                      "border-l-[3px]",
                      CAMPAIGN_TYPE_BORDER_COLORS[campaignTypeLabel] || "border-l-transparent",
                      isSelected && "bg-primary/10 border-primary/30"
                    )}
                    onClick={() => {
                      if (selectionMode) return; // Don't expand in selection mode row click
                      toggleCampaign(campaign.id);
                    }}
                  >
                    {/* Selection checkbox */}
                    {selectionMode && (
                      <div onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleCampaignSelection(campaign.id)}
                        />
                      </div>
                    )}

                    {/* Chevron indicator */}
                    <div 
                      className="p-xs"
                      onClick={(e) => {
                        if (selectionMode) {
                          e.stopPropagation();
                          toggleCampaign(campaign.id);
                        }
                      }}
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>

                     {/* Campaign name + readiness dot */}
                     <div className="flex items-center gap-xs flex-1 min-w-0">
                       <Folder className="h-4 w-4 text-primary/70 flex-shrink-0" />
                       <span className="flex-1 text-body-sm font-medium text-foreground break-words line-clamp-2">
                         {campaign.name}
                       </span>
                       <CampaignReadinessDot campaignId={campaign.id} campaignType={campaignTypeLabel} campaign={campaign} adGroups={campaignAdGroups} ads={ads} />
                     </div>

                    {/* Campaign Type Badge */}
                    <Badge 
                      variant="secondary" 
                      className={cn(
                        "text-metadata capitalize shrink-0",
                        CAMPAIGN_TYPE_BADGE_STYLES[campaignTypeLabel] || ""
                      )}
                    >
                      {campaignTypeLabel === 'search' && <Search className="h-3 w-3 mr-0.5" />}
                      {campaignTypeLabel === 'display' && <Monitor className="h-3 w-3 mr-0.5" />}
                      {campaignTypeLabel === 'app' && <Smartphone className="h-3 w-3 mr-0.5" />}
                      {campaignTypeLabel}
                    </Badge>

                    {/* Campaign Stats */}
                    <Badge variant="secondary" className="text-metadata bg-muted shrink-0">
                      {campaignAdGroups.length} groups
                    </Badge>

                    {/* Campaign Actions */}
                    {!selectionMode && (
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
                            onClick={() => setShowCreateAdGroup({ campaignId: campaign.id, campaignName: campaign.name, campaignType: campaignTypeLabel })}
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
                    )}
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
                              {/* Ad Group Row */}
                              <div 
                                className={cn(
                                  "group flex items-center gap-xs p-sm rounded-lg transition-smooth cursor-pointer",
                                  "hover:bg-card-hover active:scale-[0.99]",
                                  selectionMode && selectedAdGroupIds.has(adGroup.id) && "bg-primary/10 border border-primary/30"
                                )}
                                onClick={() => {
                                  if (onAdGroupClick) {
                                    onAdGroupClick(adGroup, campaign, selectedEntity);
                                  }
                                  toggleAdGroup(adGroup.id);
                                }}
                              >
                                {/* Ad Group selection checkbox */}
                                {selectionMode && (
                                  <div onClick={(e) => e.stopPropagation()}>
                                    <Checkbox
                                      checked={selectedAdGroupIds.has(adGroup.id)}
                                      onCheckedChange={() => toggleAdGroupSelection(adGroup.id)}
                                    />
                                  </div>
                                )}
                                <div className="p-xs">
                                  {isAdGroupExpanded ? (
                                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                                  ) : (
                                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                                  )}
                                </div>

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
                                    <DropdownMenuItem
                                      onClick={() => setMoveAdGroupDialog({ adGroup, campaignId: campaign.id, entity: selectedEntity })}
                                      className="gap-xs hover:bg-card-hover"
                                    >
                                      <ArrowRightLeft className="h-4 w-4" />
                                      <span className="text-body-sm">Move to Campaign</span>
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
                                          "hover:bg-card-hover active:scale-[0.99]",
                                          selectionMode && selectedAdIds.has(ad.id!) && "bg-primary/10 border border-primary/30"
                                        )}
                                        onClick={() => {
                                          if (selectionMode && ad.id) {
                                            toggleAdSelection(ad.id);
                                          } else {
                                            onEditAd(ad, adGroup, campaign, selectedEntity);
                                          }
                                        }}
                                      >
                                        {selectionMode && (
                                          <div onClick={(e) => e.stopPropagation()}>
                                            <Checkbox
                                              checked={selectedAdIds.has(ad.id!)}
                                              onCheckedChange={() => ad.id && toggleAdSelection(ad.id)}
                                            />
                                          </div>
                                        )}
                                        <FileText className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                        <span className="flex-1 text-body-sm text-foreground break-words line-clamp-2 min-w-0">
                                          {ad.name}
                                        </span>
                                        <Badge variant="outline" className={cn("text-metadata", getAdStrengthColor(strength))}>
                                          {strength}%
                                        </Badge>

                                        <div 
                                          className="flex items-center gap-xs opacity-0 group-hover:opacity-100 transition-smooth"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 active:scale-95"
                                            title="Move ad"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setMoveAdDialog({ ad, adGroupId: adGroup.id, campaignId: campaign.id, entity: selectedEntity });
                                            }}
                                          >
                                            <ArrowRightLeft className="h-3 w-3 text-muted-foreground" />
                                          </Button>
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

      {/* Bulk Actions Bar - Campaigns */}
      <SearchPlannerBulkBar
        selectedCampaignIds={selectedCampaignIds}
        campaigns={campaigns}
        adGroups={adGroups}
        ads={ads}
        onClearSelection={handleClearSelection}
        onRefresh={handleRefresh}
      />

      {/* Bulk Actions Bar - Ad Groups & Ads */}
      {selectionMode && (bulkSelectedAdGroupCount > 0 || bulkSelectedAdCount > 0) && selectedCampaignIds.size === 0 && (
        <div className="fixed bottom-md left-1/2 -translate-x-1/2 z-overlay">
          <div className="liquid-glass-elevated rounded-xl shadow-lg p-md flex items-center gap-md border border-border">
            <div className="flex items-center gap-sm">
              <Badge variant="default" className="bg-primary text-primary-foreground text-body-sm font-semibold px-sm">
                {bulkSelectedAdGroupCount > 0 ? bulkSelectedAdGroupCount : bulkSelectedAdCount}
              </Badge>
              <span className="text-body-sm font-semibold text-foreground">
                {bulkSelectedAdGroupCount > 0 ? `ad group(s)` : `ad(s)`} selected
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { setSelectedAdGroupIds(new Set()); setSelectedAdIds(new Set()); }}
                className="text-muted-foreground hover:text-foreground h-7 w-7 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="flex items-center gap-sm">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => bulkSelectedAdGroupCount > 0 ? setBulkMoveAdGroups(true) : setBulkMoveAds(true)}
                className="transition-smooth"
              >
                <ArrowRightLeft className="w-4 h-4 mr-xs" />
                Move
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={async () => {
                  const { data: { user } } = await supabase.auth.getUser();
                  if (!user) { toast.error('Not authenticated'); return; }
                  try {
                    if (bulkSelectedAdGroupCount > 0) {
                      const ids = Array.from(selectedAdGroupIds);
                      for (const agId of ids) {
                        const ag = adGroups.find(a => a.id === agId);
                        if (!ag) continue;
                        const { data: newAg, error: agErr } = await supabase.from('ad_groups').insert({
                          name: `${ag.name} (Copy)`,
                          campaign_id: ag.campaign_id,
                          bidding_strategy: (ag as Record<string, unknown>).bidding_strategy as string | null ?? null,
                          keywords: (ag as Record<string, unknown>).keywords as null ?? null,
                          match_types: (ag as Record<string, unknown>).match_types as null ?? null,
                          status: (ag as Record<string, unknown>).status as string | null ?? null,
                        }).select().single();
                        if (agErr) throw agErr;
                        const agAds = ads.filter(ad => ad.ad_group_id === agId);
                        for (const ad of agAds) {
                          const adRec = ad as Record<string, unknown>;
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
                            approval_status: 'draft',
                          } as any);
                        }
                      }
                      toast.success(`Duplicated ${ids.length} ad group(s)`);
                    } else {
                      const ids = Array.from(selectedAdIds);
                      for (const adId of ids) {
                        const ad = ads.find(a => a.id === adId);
                        if (!ad) continue;
                        const adRec = ad as Record<string, unknown>;
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        await supabase.from('ads').insert({
                          name: `${ad.name} (Copy)`,
                          ad_group_id: adRec.ad_group_id ?? null,
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
                          approval_status: 'draft',
                        } as any);
                      }
                      toast.success(`Duplicated ${ids.length} ad(s)`);
                    }
                    setSelectedAdGroupIds(new Set());
                    setSelectedAdIds(new Set());
                    handleRefresh();
                  } catch (error: unknown) {
                    toast.error(error instanceof Error ? error.message : 'Failed to duplicate');
                  }
                }}
                className="transition-smooth"
              >
                <Copy className="w-4 h-4 mr-xs" />
                Duplicate
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={async () => {
                  if (bulkSelectedAdGroupCount > 0) {
                    const ids = Array.from(selectedAdGroupIds);
                    const { error } = await supabase.from('ad_groups').delete().in('id', ids);
                    if (error) { toast.error(error.message); return; }
                    toast.success(`Deleted ${ids.length} ad group(s)`);
                  } else {
                    const ids = Array.from(selectedAdIds);
                    const { error } = await supabase.from('ads').delete().in('id', ids);
                    if (error) { toast.error(error.message); return; }
                    toast.success(`Deleted ${ids.length} ad(s)`);
                  }
                  setSelectedAdGroupIds(new Set());
                  setSelectedAdIds(new Set());
                  handleRefresh();
                }}
                className="transition-smooth"
              >
                <Trash2 className="w-4 h-4 mr-xs" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <CreateCampaignDialog
        open={showCreateCampaign}
        onOpenChange={setShowCreateCampaign}
        defaultEntity={selectedEntity}
        defaultCampaignType={createDialogDefaultType}
        onSuccess={handleRefresh}
      />

      {showCreateAdGroup && (
        <CreateAdGroupDialog
          open={!!showCreateAdGroup}
          onOpenChange={(open) => !open && setShowCreateAdGroup(null)}
          campaignId={showCreateAdGroup.campaignId}
          campaignName={showCreateAdGroup.campaignName}
          campaignType={showCreateAdGroup.campaignType}
          onSuccess={handleRefresh}
        />
      )}

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

      {/* Move Dialogs */}
      {moveAdGroupDialog && (
        <MoveItemDialog
          open={!!moveAdGroupDialog}
          onOpenChange={(open) => !open && setMoveAdGroupDialog(null)}
          moveType="ad_group"
          itemId={moveAdGroupDialog.adGroup.id}
          itemName={moveAdGroupDialog.adGroup.name}
          currentCampaignId={moveAdGroupDialog.campaignId}
          currentEntity={moveAdGroupDialog.entity}
          onSuccess={handleRefresh}
        />
      )}

      {moveAdDialog && (
        <MoveItemDialog
          open={!!moveAdDialog}
          onOpenChange={(open) => !open && setMoveAdDialog(null)}
          moveType="ad"
          itemId={moveAdDialog.ad.id!}
          itemName={moveAdDialog.ad.name}
          currentAdGroupId={moveAdDialog.adGroupId}
          currentCampaignId={moveAdDialog.campaignId}
          currentEntity={moveAdDialog.entity}
          onSuccess={handleRefresh}
        />
      )}

      {/* Bulk Move Dialogs */}
      <BulkMoveDialog
        open={bulkMoveAdGroups}
        onOpenChange={setBulkMoveAdGroups}
        moveType="ad_groups"
        itemIds={Array.from(selectedAdGroupIds)}
        currentEntity={selectedEntity}
        onSuccess={() => { setSelectedAdGroupIds(new Set()); handleRefresh(); }}
      />
      <BulkMoveDialog
        open={bulkMoveAds}
        onOpenChange={setBulkMoveAds}
        moveType="ads"
        itemIds={Array.from(selectedAdIds)}
        currentEntity={selectedEntity}
        onSuccess={() => { setSelectedAdIds(new Set()); handleRefresh(); }}
      />
    </div>
  );
}