import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, ChevronDown, Plus, Folder, FileText, Trash2, Copy, Edit, Search, ChevronsDown, ChevronsUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { calculateAdStrength } from "@/lib/adQualityScore";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CreateCampaignDialog } from "../ads/CreateCampaignDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ENTITIES } from "@/lib/constants";
import { DeleteAdDialog } from "./DeleteAdDialog";
import { DeleteAdGroupDialog } from "./DeleteAdGroupDialog";
import { DeleteCampaignDialog } from "./DeleteCampaignDialog";
import { DuplicateAdDialog } from "./DuplicateAdDialog";
import { DuplicateAdGroupDialog } from "./DuplicateAdGroupDialog";
import { DuplicateCampaignDialog } from "./DuplicateCampaignDialog";
import { FixedSizeList } from "react-window";

interface SearchHierarchyPanelProps {
  onEditAd: (ad: any, adGroup: any, campaign: any, entity: string) => void;
  onCreateAd: (adGroup: any, campaign: any, entity: string) => void;
  onCampaignClick?: (campaign: any, entity: string) => void;
  adType?: "search" | "display";
}

export function SearchHierarchyPanel({ onEditAd, onCreateAd, onCampaignClick, adType = "search" }: SearchHierarchyPanelProps) {
  const queryClient = useQueryClient();
  const [selectedEntity, setSelectedEntity] = useState<string>("UAE");
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set());
  const [expandedAdGroups, setExpandedAdGroups] = useState<Set<string>>(new Set());
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);
  const [showCreateAdGroup, setShowCreateAdGroup] = useState<{campaignId: string; campaignName: string} | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Delete dialogs
  const [deleteAdDialog, setDeleteAdDialog] = useState<{ad: any} | null>(null);
  const [deleteAdGroupDialog, setDeleteAdGroupDialog] = useState<{adGroup: any; adsCount: number} | null>(null);
  const [deleteCampaignDialog, setDeleteCampaignDialog] = useState<{campaign: any; adGroupsCount: number; adsCount: number} | null>(null);
  
  // Duplicate dialogs
  const [duplicateAdDialog, setDuplicateAdDialog] = useState<{ad: any} | null>(null);
  const [duplicateAdGroupDialog, setDuplicateAdGroupDialog] = useState<{adGroup: any; adsCount: number} | null>(null);
  const [duplicateCampaignDialog, setDuplicateCampaignDialog] = useState<{campaign: any; adGroupsCount: number; adsCount: number} | null>(null);

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

  // Fetch all ad groups for efficiency
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

  // Fetch all ads for efficiency
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

  const expandAllCampaigns = () => {
    setExpandedCampaigns(new Set(campaigns.map(c => c.id)));
    const allAdGroups = campaigns.flatMap(c => 
      adGroups.filter(ag => ag.campaign_id === c.id).map(ag => ag.id)
    );
    setExpandedAdGroups(new Set(allAdGroups));
  };

  const collapseAllCampaigns = () => {
    setExpandedCampaigns(new Set());
    setExpandedAdGroups(new Set());
  };

  // Filter campaigns based on search query
  const filteredCampaigns = campaigns.filter(campaign => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const matchesCampaign = campaign.name.toLowerCase().includes(query);
    
    const campaignAdGroups = adGroups.filter(ag => ag.campaign_id === campaign.id);
    const matchesAdGroup = campaignAdGroups.some(ag => ag.name.toLowerCase().includes(query));
    
    const campaignAds = campaignAdGroups.flatMap(ag => 
      ads.filter(ad => ad.ad_group_id === ag.id)
    );
    const matchesAd = campaignAds.some(ad => ad.name.toLowerCase().includes(query));
    
    return matchesCampaign || matchesAdGroup || matchesAd;
  });

  const handleCampaignCreated = () => {
    setShowCreateCampaign(false);
    queryClient.invalidateQueries({ queryKey: ['campaigns-hierarchy'] });
    queryClient.invalidateQueries({ queryKey: ['ad-campaigns-tree'] });
  };

  const handleAdGroupCreated = (adGroupId: string) => {
    setShowCreateAdGroup(null);
    queryClient.invalidateQueries({ queryKey: ['ad-groups-hierarchy'] });
    queryClient.invalidateQueries({ queryKey: ['ad-groups-tree'] });
  };

  const handleDeleteSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['campaigns-hierarchy'] });
    queryClient.invalidateQueries({ queryKey: ['ad-groups-hierarchy'] });
    queryClient.invalidateQueries({ queryKey: ['ads-hierarchy'] });
    queryClient.invalidateQueries({ queryKey: ['ads'] });
    queryClient.invalidateQueries({ queryKey: ['ad-groups'] });
    queryClient.invalidateQueries({ queryKey: ['ad-campaigns'] });
  };

  const handleDuplicateSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['campaigns-hierarchy'] });
    queryClient.invalidateQueries({ queryKey: ['ad-groups-hierarchy'] });
    queryClient.invalidateQueries({ queryKey: ['ads-hierarchy'] });
  };

  // Virtualized Ad List Component
  interface VirtualizedAdListProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ads: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onEditAd: (ad: any) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onDuplicateAd: (ad: any) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onDeleteAd: (ad: any) => void;
  }

  const VirtualizedAdList = ({ ads, onEditAd, onDuplicateAd, onDeleteAd }: VirtualizedAdListProps) => {
    const AdRow = ({ index, style }: { index: number; style: React.CSSProperties }) => {
      const ad = ads[index];
      const strengthResult = calculateAdStrength(
        Array.isArray(ad.headlines) ? ad.headlines : [],
        Array.isArray(ad.descriptions) ? ad.descriptions : [],
        (ad.sitelinks || []).map((s: any) => s?.description || s?.text || ''),
        (ad.callouts || []).map((c: any) => c?.text || c || '')
      );

      const strength = typeof strengthResult === 'number' ? strengthResult : strengthResult.score;

      const strengthColor = 
        strength >= 80 ? "text-success" :
        strength >= 60 ? "text-warning" :
        "text-destructive";

      return (
        <div style={style}>
          <div 
            className="group flex items-center gap-3 p-2 pl-14 hover:bg-accent/20 rounded-lg cursor-pointer transition-all"
            onClick={() => onEditAd(ad)}
          >
            <FileText className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <span className="flex-1 text-sm truncate">{ad.name}</span>
            <Badge variant="outline" className={`text-xs ${strengthColor}`}>
              {strength}%
            </Badge>
            
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1" onClick={(e) => e.stopPropagation()}>
              <Button 
                size="icon-xs" 
                variant="ghost" 
                className="hover:bg-background"
                onClick={() => onEditAd(ad)}
                title="Edit"
              >
                <Edit />
              </Button>
              <Button 
                size="icon-xs" 
                variant="ghost" 
                className="hover:bg-background"
                onClick={() => onDuplicateAd(ad)}
                title="Duplicate"
              >
                <Copy />
              </Button>
              <Button 
                size="icon-xs" 
                variant="ghost" 
                className="hover:bg-destructive/10 text-destructive"
                onClick={() => onDeleteAd(ad)}
                title="Delete"
              >
                <Trash2 />
              </Button>
            </div>
          </div>
        </div>
      );
    };

    // Only virtualize if we have many ads (>20)
    if (ads.length <= 20) {
      return (
        <div className="space-y-0.5">
          {ads.map((ad, index) => (
            <AdRow key={ad.id} index={index} style={{}} />
          ))}
        </div>
      );
    }

    return (
      <FixedSizeList
        height={Math.min(ads.length * 42, 400)} // 42px per item, max 400px
        itemCount={ads.length}
        itemSize={42}
        width="100%"
      >
        {AdRow}
      </FixedSizeList>
    );
  };

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

  return (
    <div className="h-full flex flex-col">
      <div className="p-md border-b bg-background space-y-md">
        <div className="space-y-sm">
          <Label className="text-metadata font-medium text-muted-foreground">Entity</Label>
          <Select value={selectedEntity || undefined} onValueChange={setSelectedEntity}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Select entity" />
            </SelectTrigger>
            <SelectContent>
              {ENTITIES.map(entity => (
                <SelectItem key={entity} value={entity}>{entity}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setShowCreateCampaign(true)} className="w-full h-9" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          New Campaign
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-md space-y-sm">
          {filteredCampaigns.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-body-sm">
              {searchQuery ? 'No matching results found.' : 'No campaigns yet. Create one to get started.'}
            </div>
          ) : (
            filteredCampaigns.map(campaign => {
              const campaignAdGroups = getAdGroupsForCampaign(campaign.id);
              const isExpanded = expandedCampaigns.has(campaign.id);

              return (
                <Collapsible key={campaign.id} open={isExpanded}>
                  <div className="space-y-0.5">
                    <div 
                      className="group flex items-center gap-2 p-2.5 pl-3 hover:bg-accent/50 rounded-lg transition-all border border-transparent hover:border-border hover:shadow-sm"
                    >
                      <div 
                        className="flex items-center gap-2 flex-1 cursor-pointer"
                        onClick={() => toggleCampaign(campaign.id)}
                      >
                        {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                        <Folder className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span 
                          className="flex-1 font-medium text-sm hover:text-primary transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onCampaignClick) {
                              onCampaignClick(campaign, selectedEntity);
                            }
                          }}
                        >
                          {campaign.name}
                        </span>
                        <Badge variant="secondary" className="text-metadata font-normal">
                          {campaignAdGroups.length}
                        </Badge>
                      </div>
                    
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                      <Button 
                        size="icon-xs" 
                        variant="ghost" 
                        className="hover:bg-background"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowCreateAdGroup({ campaignId: campaign.id, campaignName: campaign.name });
                        }}
                        title="Create ad group"
                      >
                        <Plus />
                      </Button>
                      <Button 
                        size="icon-xs" 
                        variant="ghost" 
                        className="hover:bg-background"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDuplicateCampaignDialog({ 
                            campaign, 
                            adGroupsCount: campaignAdGroups.length, 
                            adsCount: getTotalAdsForCampaign(campaign.id) 
                          });
                        }}
                        title="Duplicate"
                      >
                        <Copy />
                      </Button>
                      <Button 
                        size="icon-xs" 
                        variant="ghost" 
                        className="hover:bg-destructive/10 text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteCampaignDialog({ 
                            campaign, 
                            adGroupsCount: campaignAdGroups.length, 
                            adsCount: getTotalAdsForCampaign(campaign.id) 
                          });
                        }}
                        title="Delete"
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </div>
                </div>
                  
                  <CollapsibleContent>
                    <div className="space-y-0.5 mt-1">
                        {campaignAdGroups.length === 0 ? (
                          <div className="text-metadata text-muted-foreground py-xs px-xs">
                            No ad groups yet
                          </div>
                        ) : (
                          campaignAdGroups.map(adGroup => {
                            const adGroupAds = getAdsForAdGroup(adGroup.id);
                            const isAdGroupExpanded = expandedAdGroups.has(adGroup.id);

                            return (
                              <Collapsible key={adGroup.id} open={isAdGroupExpanded}>
                                <div className="group flex items-center gap-sm p-sm pl-sm ml-lg hover:bg-accent/30 rounded-lg transition-all">
                                  <div 
                                    className="flex items-center gap-sm flex-1 cursor-pointer min-w-0"
                                    onClick={() => toggleAdGroup(adGroup.id)}
                                  >
                                    {isAdGroupExpanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                                    <Folder className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                    <span className="flex-1 text-body-sm truncate">{adGroup.name}</span>
                                    <Badge variant="outline" className="text-metadata font-normal flex-shrink-0">
                                      {adGroupAds.length}
                                    </Badge>
                                  </div>
                                  
                                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 flex-shrink-0">
                                    <Button 
                                      size="icon-xs" 
                                      variant="ghost" 
                                      className="hover:bg-background"
                                      onMouseDown={(e) => {
                                        e.stopPropagation();
                                      }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onCreateAd(adGroup, campaign, selectedEntity);
                                      }}
                                      title="Create ad"
                                    >
                                      <Plus />
                                    </Button>
                                    <Button 
                                      size="icon-xs" 
                                      variant="ghost" 
                                      className="hover:bg-background"
                                      onMouseDown={(e) => {
                                        e.stopPropagation();
                                      }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDuplicateAdGroupDialog({ adGroup, adsCount: adGroupAds.length });
                                      }}
                                      title="Duplicate"
                                    >
                                      <Copy />
                                    </Button>
                                    <Button 
                                      size="icon-xs" 
                                      variant="ghost" 
                                      className="hover:bg-destructive/10 text-destructive"
                                      onMouseDown={(e) => {
                                        e.stopPropagation();
                                      }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDeleteAdGroupDialog({ adGroup, adsCount: adGroupAds.length });
                                      }}
                                      title="Delete"
                                    >
                                      <Trash2 />
                                    </Button>
                                  </div>
                                </div>
                                
                                <CollapsibleContent>
                                  <div className="mt-1 ml-6">
                                      {adGroupAds.length === 0 ? (
                                        <div className="text-xs text-muted-foreground py-2 px-2">
                                          No ads yet
                                        </div>
                                      ) : (
                                        <VirtualizedAdList
                                          ads={adGroupAds}
                                          onEditAd={(ad) => onEditAd(ad, adGroup, campaign, selectedEntity)}
                                          onDuplicateAd={(ad) => setDuplicateAdDialog({ ad })}
                                          onDeleteAd={(ad) => setDeleteAdDialog({ ad })}
                                        />
                                      )}
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

      {/* Create Campaign Dialog */}
      <CreateCampaignDialog
        open={showCreateCampaign}
        onOpenChange={setShowCreateCampaign}
        defaultEntity={selectedEntity}
        defaultAdType={adType}
        onSuccess={handleCampaignCreated}
      />

      {/* Create Ad Group Dialog */}
      {showCreateAdGroup && (
        <CreateAdGroupDialog
          open={!!showCreateAdGroup}
          onOpenChange={(open) => !open && setShowCreateAdGroup(null)}
          campaignId={showCreateAdGroup.campaignId}
          campaignName={showCreateAdGroup.campaignName}
          onSuccess={handleAdGroupCreated}
        />
      )}

      {/* Delete Dialogs */}
      {deleteAdDialog && (
        <DeleteAdDialog
          open={!!deleteAdDialog}
          onOpenChange={(open) => !open && setDeleteAdDialog(null)}
          ad={deleteAdDialog.ad}
          onSuccess={handleDeleteSuccess}
        />
      )}

      {deleteAdGroupDialog && (
        <DeleteAdGroupDialog
          open={!!deleteAdGroupDialog}
          onOpenChange={(open) => !open && setDeleteAdGroupDialog(null)}
          adGroup={deleteAdGroupDialog.adGroup}
          adsCount={deleteAdGroupDialog.adsCount}
          onSuccess={handleDeleteSuccess}
        />
      )}

      {deleteCampaignDialog && (
        <DeleteCampaignDialog
          open={!!deleteCampaignDialog}
          onOpenChange={(open) => !open && setDeleteCampaignDialog(null)}
          campaign={deleteCampaignDialog.campaign}
          adGroupsCount={deleteCampaignDialog.adGroupsCount}
          adsCount={deleteCampaignDialog.adsCount}
          onSuccess={handleDeleteSuccess}
        />
      )}

      {/* Duplicate Dialogs */}
      {duplicateAdDialog && (
        <DuplicateAdDialog
          open={!!duplicateAdDialog}
          onOpenChange={(open) => !open && setDuplicateAdDialog(null)}
          ad={duplicateAdDialog.ad}
          onSuccess={handleDuplicateSuccess}
        />
      )}

      {duplicateAdGroupDialog && (
        <DuplicateAdGroupDialog
          open={!!duplicateAdGroupDialog}
          onOpenChange={(open) => !open && setDuplicateAdGroupDialog(null)}
          adGroup={duplicateAdGroupDialog.adGroup}
          adsCount={duplicateAdGroupDialog.adsCount}
          onSuccess={handleDuplicateSuccess}
        />
      )}

      {duplicateCampaignDialog && (
        <DuplicateCampaignDialog
          open={!!duplicateCampaignDialog}
          onOpenChange={(open) => !open && setDuplicateCampaignDialog(null)}
          campaign={duplicateCampaignDialog.campaign}
          adGroupsCount={duplicateCampaignDialog.adGroupsCount}
          adsCount={duplicateCampaignDialog.adsCount}
          onSuccess={handleDuplicateSuccess}
        />
      )}
    </div>
  );
}

// Simple Ad Group Creation Dialog
function CreateAdGroupDialog({ 
  open, 
  onOpenChange, 
  campaignId, 
  campaignName, 
  onSuccess 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
  campaignId: string; 
  campaignName: string; 
  onSuccess: (id: string) => void;
}) {
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Please enter an ad group name");
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("ad_groups")
        .insert({
          name: name.trim(),
          campaign_id: campaignId,
          status: "active"
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Ad group created successfully");
      setName("");
      onSuccess(data.id);
    } catch (error: any) {
      toast.error(error.message || "Failed to create ad group");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Ad Group</DialogTitle>
        </DialogHeader>
        <div className="space-y-md py-md">
          <div className="text-sm text-muted-foreground">
            Campaign: <span className="font-medium">{campaignName}</span>
          </div>
          <div className="space-y-2">
            <Label htmlFor="adgroup-name">Ad Group Name *</Label>
            <Input
              id="adgroup-name"
              placeholder="e.g., Exact Match Keywords"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <Button onClick={handleCreate} disabled={isLoading} className="w-full">
            {isLoading ? "Creating..." : "Create Ad Group"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
