import { useState } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, GripVertical, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { CampaignEntityTracking, useCampaignEntityTracking } from "@/hooks/useCampaignEntityTracking";
import { useUtmCampaigns } from "@/hooks/useUtmCampaigns";
import { useCampaignVersions } from "@/hooks/useCampaignVersions";
import { UtmCampaignDetailDialog } from "./UtmCampaignDetailDialog";
import { EntityCommentsDialog } from "./EntityCommentsDialog";
import { ENTITY_STATUS_CONFIG, EntityTrackingStatus } from "@/domain/campaigns";

interface Campaign {
  id: string;
  name: string;
}

interface CampaignTrackingCardProps {
  tracking: CampaignEntityTracking;
  campaign: Campaign | undefined;
  entity: string;
  isExternal?: boolean;
  externalReviewerName?: string;
  externalReviewerEmail?: string;
}

// Sub-component to fetch and display version thumbnail
function CampaignThumbnail({ campaignId }: { campaignId: string }) {
  const { useVersions } = useCampaignVersions();
  const { data: versions = [] } = useVersions(campaignId);
  const latestVersion = versions[0];

  if (!latestVersion?.image_url) {
    return (
      <div className="w-full aspect-video rounded-md bg-muted flex items-center justify-center mb-sm">
        <ImageIcon className="size-5 text-muted-foreground" />
      </div>
    );
  }

  return (
    <img 
      src={latestVersion.image_url} 
      alt="Creative" 
      className="w-full aspect-video rounded-md object-cover border border-border mb-sm"
    />
  );
}

interface EntityCampaignTableProps {
  entity: string;
  campaigns: Campaign[];
  isExternal?: boolean;
  externalReviewerName?: string;
  externalReviewerEmail?: string;
  className?: string;
}

function CampaignTrackingCard({
  tracking,
  campaign,
  entity,
  isExternal = false,
  externalReviewerName,
  externalReviewerEmail,
}: CampaignTrackingCardProps) {
  const [detailOpen, setDetailOpen] = useState(false);
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: `entity-campaign-${tracking.id}`,
    data: { trackingId: tracking.id, campaignId: tracking.campaign_id },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  const statusConfig = ENTITY_STATUS_CONFIG[tracking.status as EntityTrackingStatus] || ENTITY_STATUS_CONFIG.Draft;

  if (!campaign) return null;

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className="relative group transition-smooth"
      >
        <Card className="border border-border bg-card hover:border-primary/50 hover:shadow-md transition-smooth cursor-pointer overflow-hidden">
          <CardContent className="p-sm">
            {/* Thumbnail */}
            <div onClick={() => setDetailOpen(true)}>
              <CampaignThumbnail campaignId={tracking.campaign_id} />
            </div>
            
            <div className="flex items-start gap-sm">
              {/* Drag Handle */}
              {!isExternal && (
                <div
                  {...listeners}
                  {...attributes}
                  className="cursor-grab active:cursor-grabbing hover:bg-muted rounded p-xs transition-colors flex-shrink-0 mt-0.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <GripVertical className="size-4 text-muted-foreground" />
                </div>
              )}
              
              {/* Content */}
              <div className="flex-1 min-w-0" onClick={() => setDetailOpen(true)}>
                <p className="text-body-sm font-medium line-clamp-2 text-foreground">
                  {campaign.name}
                </p>
                <Badge 
                  className={cn("mt-sm text-[10px] px-1.5 py-0", statusConfig.bgColor, statusConfig.color)}
                >
                  {tracking.status}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <UtmCampaignDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        campaignId={tracking.campaign_id}
      />
    </>
  );
}

export function EntityCampaignTable({
  entity,
  campaigns,
  isExternal = false,
  externalReviewerName,
  externalReviewerEmail,
  className,
}: EntityCampaignTableProps) {
  const [commentsOpen, setCommentsOpen] = useState(false);
  const { trackingRecords } = useCampaignEntityTracking();
  const { data: allCampaigns = [] } = useUtmCampaigns();
  const { setNodeRef, isOver } = useDroppable({ id: `entity-${entity}` });

  // For external users, use provided campaigns directly
  // For internal users, use tracking records
  const entityCampaigns = isExternal
    ? campaigns.map((campaign) => ({
        tracking: { 
          id: campaign.id, 
          campaign_id: campaign.id, 
          entity, 
          status: 'Live',
          notes: (campaign as any).notes || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: null,
          entity_comments: null,
        } as CampaignEntityTracking,
        campaign,
      }))
    : trackingRecords
        .filter((t) => t.entity === entity)
        .map((t) => ({
          tracking: t,
          campaign: allCampaigns.find((c) => c.id === t.campaign_id) || null,
        }))
        .filter((item) => item.campaign);

  return (
    <>
      <EntityCommentsDialog
        open={commentsOpen}
        onOpenChange={setCommentsOpen}
        entityName={entity}
        isExternal={isExternal}
        externalReviewerName={externalReviewerName}
        externalReviewerEmail={externalReviewerEmail}
      />

      <Card 
        ref={setNodeRef}
        className={cn(
          "transition-smooth bg-card border-border",
          isOver && "ring-2 ring-primary ring-offset-2 ring-offset-background",
          className
        )}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-sm border-b border-border/50">
          <CardTitle className="text-heading-sm">{entity}</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCommentsOpen(true)}
          >
            <MessageSquare />
            Comments
          </Button>
        </CardHeader>
        <CardContent className="pt-md">
          <div className="min-h-[300px]">
            {entityCampaigns.length === 0 ? (
              <div className="flex items-center justify-center h-[300px] border-2 border-dashed border-border rounded-lg bg-muted/30">
                <p className="text-body-sm text-muted-foreground">
                  Drag campaigns here
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-md">
                {entityCampaigns.map(({ tracking, campaign }) => (
                  campaign && (
                    <CampaignTrackingCard
                      key={tracking.id}
                      tracking={tracking}
                      campaign={campaign}
                      entity={entity}
                      isExternal={isExternal}
                      externalReviewerName={externalReviewerName}
                      externalReviewerEmail={externalReviewerEmail}
                    />
                  )
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
