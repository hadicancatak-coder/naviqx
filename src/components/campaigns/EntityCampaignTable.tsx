import { useState } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { CampaignEntityTracking, useCampaignEntityTracking } from "@/hooks/useCampaignEntityTracking";
import { useUtmCampaigns } from "@/hooks/useUtmCampaigns";
import { UtmCampaignDetailDialog } from "./UtmCampaignDetailDialog";
import { EntityCommentsDialog } from "./EntityCommentsDialog";

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

  if (!campaign) return null;

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className="relative group transition-all duration-200"
      >
        <Card className="border-2 border-border bg-card hover:border-primary hover:shadow-md transition-smooth cursor-pointer">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              {/* Drag Handle */}
              {!isExternal && (
                <div
                  {...listeners}
                  {...attributes}
                  className="cursor-grab active:cursor-grabbing hover:bg-muted rounded p-1 transition-colors flex-shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <GripVertical className="size-4 text-muted-foreground" />
                </div>
              )}
              {/* Campaign Name */}
              <p 
                className="text-sm font-medium line-clamp-2 flex-1"
                onClick={() => setDetailOpen(true)}
              >
                {campaign.name}
              </p>
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
          status: 'active',
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
          "transition-all bg-card shadow-md hover:shadow-lg",
          isOver && "ring-2 ring-primary ring-offset-2",
          className
        )}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-lg">{entity}</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCommentsOpen(true)}
          >
            <MessageSquare />
            Comments
          </Button>
        </CardHeader>
        <CardContent>
          <div className="min-h-[300px] p-lg">
            {entityCampaigns.length === 0 ? (
              <div className="flex items-center justify-center h-[300px] border-2 border-dashed border-muted-foreground/30 rounded-lg">
                <p className="text-sm text-muted-foreground">
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
