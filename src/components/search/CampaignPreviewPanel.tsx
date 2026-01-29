import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SearchAdPreview } from "@/components/ads/SearchAdPreview";
import { ChevronDown, Target, Calendar, DollarSign, Globe, Plus, ChevronRight, Folder, FileText } from "lucide-react";
import { useMemo, useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { calculateAdStrength } from "@/lib/adQualityScore";

interface CampaignPreviewPanelProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  campaign: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adGroups: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ads: any[];
  entity: string;
  onViewAllAds?: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onEditAd?: (ad: any, adGroup: any, campaign: any, entity: string) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onCreateAd?: (adGroup: any, campaign: any, entity: string) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onCreateAdGroup?: (campaign: any, entity: string) => void;
}

export function CampaignPreviewPanel({ 
  campaign, 
  adGroups, 
  ads, 
  entity,
  onViewAllAds,
  onEditAd,
  onCreateAd,
  onCreateAdGroup
}: CampaignPreviewPanelProps) {
  
  const [expandedAdGroups, setExpandedAdGroups] = useState<Set<string>>(new Set());

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

  const getAdsForAdGroup = (adGroupId: string) => {
    return ads.filter(ad => ad.ad_group_id === adGroupId);
  };

  // Calculate status distribution
  const statusCounts = useMemo(() => {
    const counts = {
      draft: 0,
      active: 0,
      paused: 0,
    };
    
    ads.forEach(ad => {
      const status = ad.approval_status || 'draft';
      if (status in counts) {
        counts[status as keyof typeof counts]++;
      }
    });
    
    return counts;
  }, [ads]);

  // Calculate average character usage
  const avgCharUsage = useMemo(() => {
    if (ads.length === 0) return { headlines: 0, descriptions: 0 };
    
    let totalHeadlineChars = 0;
    let totalHeadlineCount = 0;
    let totalDescChars = 0;
    let totalDescCount = 0;
    
    ads.forEach(ad => {
      if (Array.isArray(ad.headlines)) {
        ad.headlines.forEach((h: string) => {
          if (h?.trim()) {
            totalHeadlineChars += h.length;
            totalHeadlineCount++;
          }
        });
      }
      
      if (Array.isArray(ad.descriptions)) {
        ad.descriptions.forEach((d: string) => {
          if (d?.trim()) {
            totalDescChars += d.length;
            totalDescCount++;
          }
        });
      }
    });
    
    return {
      headlines: totalHeadlineCount > 0 ? Math.round(totalHeadlineChars / totalHeadlineCount) : 0,
      descriptions: totalDescCount > 0 ? Math.round(totalDescChars / totalDescCount) : 0,
    };
  }, [ads]);

  return (
    <div className="h-full flex flex-col bg-muted/30">
      <div className="border-b bg-background p-md">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-heading-md font-semibold truncate mb-xs">{campaign.name}</h2>
            <div className="flex items-center gap-sm flex-wrap">
              <Badge variant="outline" className="gap-xs">
                <Target className="h-3 w-3" />
                {entity}
              </Badge>
              <Badge variant="outline" className="gap-xs">
                <Globe className="h-3 w-3" />
                {campaign.languages?.join(', ') || 'EN'}
              </Badge>
              {campaign.budget_monthly && (
                <Badge variant="outline" className="gap-xs">
                  <DollarSign className="h-3 w-3" />
                  ${campaign.budget_monthly}/mo
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-md space-y-md">
        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-sm">
          <Card className="p-sm bg-card hover:bg-accent/50 transition-smooth border-l-4 border-l-primary">
            <p className="text-metadata text-muted-foreground mb-xs">Ad Groups</p>
            <p className="text-heading-lg font-bold">{adGroups.length}</p>
          </Card>

          <Card className="p-sm bg-card hover:bg-accent/50 transition-smooth border-l-4 border-l-success">
            <p className="text-metadata text-muted-foreground mb-xs">Total Ads</p>
            <p className="text-heading-lg font-bold">{ads.length}</p>
          </Card>
          
          <Card className="p-sm bg-card hover:bg-accent/50 transition-smooth border-l-4 border-l-warning">
            <p className="text-metadata text-muted-foreground mb-xs">Active</p>
            <p className="text-heading-lg font-bold text-success">{ads.filter(ad => ad.approval_status === 'active').length}</p>
          </Card>
        </div>

        {/* Ad Groups with Ads */}
        <Card className="p-md border-border">
          <div className="flex items-center justify-between mb-md">
            <h3 className="text-body font-semibold flex items-center gap-xs">
              <div className="h-1 w-8 bg-gradient-to-r from-primary to-primary/50 rounded-full" />
              Ad Groups & Ads
            </h3>
            {onCreateAdGroup && (
              <Button size="sm" variant="outline" onClick={() => onCreateAdGroup(campaign, entity)}>
                <Plus className="h-4 w-4 mr-2" />
                New Ad Group
              </Button>
            )}
          </div>

          {adGroups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No ad groups yet. Create one to get started.
            </div>
          ) : (
            <div className="space-y-sm">
              {adGroups.map(adGroup => {
                const adGroupAds = getAdsForAdGroup(adGroup.id);
                const isExpanded = expandedAdGroups.has(adGroup.id);

                return (
                  <Collapsible key={adGroup.id} open={isExpanded} onOpenChange={() => toggleAdGroup(adGroup.id)}>
                    <div className="border border-border rounded-lg overflow-hidden">
                      <CollapsibleTrigger className="w-full">
                        <div className="flex items-center gap-2 p-sm bg-muted/50 hover:bg-muted transition-smooth cursor-pointer">
                          {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                          <Folder className="h-4 w-4 text-primary" />
                          <span className="flex-1 text-left font-medium text-body-sm">{adGroup.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {adGroupAds.length} ads
                          </Badge>
                        </div>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <div className="p-sm space-y-xs bg-background">
                          {onCreateAd && (
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="w-full justify-start text-muted-foreground hover:text-foreground"
                              onClick={() => onCreateAd(adGroup, campaign, entity)}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              New Ad in {adGroup.name}
                            </Button>
                          )}
                          
                          {adGroupAds.length === 0 ? (
                            <p className="text-xs text-muted-foreground py-2 px-2">No ads yet</p>
                          ) : (
                            <div className="space-y-xs">
                              {adGroupAds.map(ad => {
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
                                  <div 
                                    key={ad.id}
                                    className="flex items-center gap-2 p-2 hover:bg-accent/50 rounded-md cursor-pointer transition-smooth group"
                                    onClick={() => onEditAd && onEditAd(ad, adGroup, campaign, entity)}
                                  >
                                    <FileText className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                    <span className="flex-1 text-sm truncate">{ad.name}</span>
                                    <Badge variant="outline" className={`text-xs ${strengthColor}`}>
                                      {strength}%
                                    </Badge>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
