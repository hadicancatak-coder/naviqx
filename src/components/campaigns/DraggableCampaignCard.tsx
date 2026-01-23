import { useDraggable } from "@dnd-kit/core";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface Campaign {
  id: string;
  name: string;
  campaign_type: string;
  description: string;
  landing_page: string;
  is_active: boolean;
}

interface DraggableCampaignCardProps {
  campaign: Campaign;
  isDragging?: boolean;
  onClick?: () => void;
}

export function DraggableCampaignCard({ campaign, isDragging, onClick }: DraggableCampaignCardProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: campaign.id,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        "w-full transition-all hover:shadow-lg border-2",
        isDragging && "opacity-50 shadow-xl scale-105"
      )}
    >
      <CardContent className="p-sm space-y-sm">
        {/* Header with Drag Handle */}
        <div className="flex items-center gap-sm">
          {/* Drag Handle - Only this part is draggable */}
          <div
            {...listeners}
            {...attributes}
            className="cursor-grab active:cursor-grabbing hover:bg-muted rounded p-xs"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </div>
          {/* Title - Clickable */}
          <h3 
            className="font-semibold text-body-sm line-clamp-2 flex-1 cursor-pointer hover:text-primary transition-colors"
            onClick={onClick}
          >
            {campaign.name}
          </h3>
        </div>

        {/* Content - Clickable */}
        <div className="cursor-pointer space-y-sm" onClick={onClick}>
          {/* Campaign Type */}
          <Badge variant="outline" className="text-metadata w-fit">
            {campaign.campaign_type}
          </Badge>

          {/* Description */}
          {campaign.description && (
            <p className="text-metadata text-muted-foreground line-clamp-2">
              {campaign.description}
            </p>
          )}

          {/* Landing Page */}
          {campaign.landing_page && (() => {
            try {
              const hostname = new URL(campaign.landing_page).hostname;
              return (
                <div className="flex items-center gap-xs text-metadata text-muted-foreground">
                  <ExternalLink className="h-3 w-3" />
                  <span className="truncate">{hostname}</span>
                </div>
              );
            } catch {
              return null;
            }
          })()}

          {/* Status */}
          {!campaign.is_active && (
            <Badge variant="secondary" className="text-metadata w-fit">
              Inactive
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
