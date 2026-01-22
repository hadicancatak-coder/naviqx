import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ExternalLink, Eye, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCampaignEntityTracking } from "@/hooks/useCampaignEntityTracking";
import { useCampaignVersions } from "@/hooks/useCampaignVersions";
import { ENTITY_STATUS_CONFIG, EntityTrackingStatus } from "@/domain/campaigns";

interface Campaign {
  id: string;
  name: string;
  campaign_type: string;
  description: string;
  landing_page: string;
  is_active: boolean;
}

interface CampaignListViewProps {
  campaigns: Campaign[];
  selectedCampaigns: string[];
  onSelectCampaign: (id: string) => void;
  onCampaignClick: (id: string) => void;
}

function CampaignRowImage({ campaignId }: { campaignId: string }) {
  const { useVersions } = useCampaignVersions();
  const { data: versions = [] } = useVersions(campaignId);
  const latestVersion = versions[0];
  
  if (!latestVersion?.image_url) {
    return (
      <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center">
        <ImageIcon className="size-4 text-muted-foreground" />
      </div>
    );
  }
  
  return (
    <img 
      src={latestVersion.image_url} 
      alt="Creative" 
      className="w-12 h-12 rounded-md object-cover border border-border"
    />
  );
}

export function CampaignListView({
  campaigns,
  selectedCampaigns,
  onSelectCampaign,
  onCampaignClick,
}: CampaignListViewProps) {
  const { getEntitiesForCampaign } = useCampaignEntityTracking();

  const allSelected = campaigns.length > 0 && campaigns.every(c => selectedCampaigns.includes(c.id));
  const someSelected = campaigns.some(c => selectedCampaigns.includes(c.id));

  const handleSelectAll = () => {
    if (allSelected) {
      campaigns.forEach(c => {
        if (selectedCampaigns.includes(c.id)) onSelectCampaign(c.id);
      });
    } else {
      campaigns.forEach(c => {
        if (!selectedCampaigns.includes(c.id)) onSelectCampaign(c.id);
      });
    }
  };

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="w-10">
              <Checkbox 
                checked={allSelected} 
                onCheckedChange={handleSelectAll}
                className={cn(someSelected && !allSelected && "data-[state=checked]:bg-primary/50")}
              />
            </TableHead>
            <TableHead className="w-16">Image</TableHead>
            <TableHead>Campaign Name</TableHead>
            <TableHead className="w-28">Type</TableHead>
            <TableHead>Landing Page</TableHead>
            <TableHead>Entities</TableHead>
            <TableHead className="w-20 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {campaigns.map((campaign) => {
            const entities = getEntitiesForCampaign(campaign.id);
            const isSelected = selectedCampaigns.includes(campaign.id);
            
            return (
              <TableRow 
                key={campaign.id} 
                className={cn(
                  "transition-smooth cursor-pointer",
                  isSelected && "bg-primary/5"
                )}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox 
                    checked={isSelected}
                    onCheckedChange={() => onSelectCampaign(campaign.id)}
                  />
                </TableCell>
                <TableCell onClick={() => onCampaignClick(campaign.id)}>
                  <CampaignRowImage campaignId={campaign.id} />
                </TableCell>
                <TableCell onClick={() => onCampaignClick(campaign.id)}>
                  <div>
                    <p className="font-medium text-foreground">{campaign.name}</p>
                    {campaign.description && (
                      <p className="text-metadata text-muted-foreground line-clamp-1 mt-0.5">
                        {campaign.description}
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell onClick={() => onCampaignClick(campaign.id)}>
                  <Badge variant="outline" className="text-metadata">
                    {campaign.campaign_type}
                  </Badge>
                </TableCell>
                <TableCell onClick={() => onCampaignClick(campaign.id)}>
                  {campaign.landing_page ? (
                    <a 
                      href={campaign.landing_page}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-primary hover:underline text-body-sm flex items-center gap-1"
                    >
                      {(() => {
                        try {
                          return new URL(campaign.landing_page).hostname;
                        } catch {
                          return campaign.landing_page;
                        }
                      })()}
                      <ExternalLink className="size-3" />
                    </a>
                  ) : (
                    <span className="text-muted-foreground text-body-sm">—</span>
                  )}
                </TableCell>
                <TableCell onClick={() => onCampaignClick(campaign.id)}>
                  <div className="flex flex-wrap gap-1">
                    {entities.length === 0 ? (
                      <span className="text-muted-foreground text-metadata">No entities</span>
                    ) : (
                      entities.slice(0, 3).map((e) => {
                        const statusConfig = ENTITY_STATUS_CONFIG[e.status as EntityTrackingStatus] || ENTITY_STATUS_CONFIG.Draft;
                        return (
                          <Badge 
                            key={e.id} 
                            variant="secondary" 
                            className={cn("text-metadata", statusConfig.bgColor, statusConfig.color)}
                          >
                            {e.entity}
                            <span className="ml-1 opacity-70">• {e.status}</span>
                          </Badge>
                        );
                      })
                    )}
                    {entities.length > 3 && (
                      <Badge variant="secondary" className="text-metadata">
                        +{entities.length - 3}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Button 
                    variant="ghost" 
                    size="icon-sm"
                    onClick={() => onCampaignClick(campaign.id)}
                  >
                    <Eye className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
