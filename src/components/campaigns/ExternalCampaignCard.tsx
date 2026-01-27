import { MessageSquare, Image as ImageIcon, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Version {
  id: string;
  utm_campaign_id: string;
  version_number: number;
  version_notes: string | null;
  image_url: string | null;
  asset_link: string | null;
  created_at: string;
}

interface ExternalComment {
  id: string;
  campaign_id: string | null;
  version_id: string | null;
  entity: string;
  reviewer_name: string;
  reviewer_email: string;
  comment_text: string;
  comment_type: string | null;
  created_at: string;
}

interface ExternalCampaignCardProps {
  campaign: {
    id: string;
    name: string;
    lp_type?: string;
    campaign_type?: string;
    landing_page?: string;
  };
  versions: Version[];
  comments: ExternalComment[];
  isSelected: boolean;
  onSelect: () => void;
}

export function ExternalCampaignCard({
  campaign,
  versions,
  comments,
  isSelected,
  onSelect,
}: ExternalCampaignCardProps) {
  // Get the latest version with an image
  const latestVersionWithImage = versions.find(v => v.image_url);
  const latestImage = latestVersionWithImage?.image_url;
  const versionCount = versions.length;
  
  // Count total comments for this campaign's versions
  const totalComments = comments.filter(c => 
    versions.some(v => v.id === c.version_id)
  ).length;

  return (
    <Card 
      className={cn(
        "overflow-hidden cursor-pointer transition-smooth",
        isSelected 
          ? "ring-2 ring-primary shadow-lg scale-[1.02]" 
          : "hover:shadow-soft hover:-translate-y-0.5"
      )}
      onClick={onSelect}
    >
      {/* Compact Thumbnail */}
      <div className="relative aspect-[3/2] bg-muted overflow-hidden">
        {latestImage ? (
          <img
            src={latestImage}
            alt={campaign.name}
            className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="h-10 w-10 text-muted-foreground" />
          </div>
        )}
        
        {/* Overlay badges */}
        <div className="absolute top-2 left-2 flex gap-1">
          <Badge variant="secondary" className="bg-background/90 backdrop-blur-sm text-metadata">
            {versionCount} version{versionCount !== 1 ? 's' : ''}
          </Badge>
        </div>
        
        {totalComments > 0 && (
          <div className="absolute top-2 right-2">
            <Badge className="bg-primary/90 backdrop-blur-sm text-metadata">
              <MessageSquare className="h-3 w-3 mr-1" />
              {totalComments}
            </Badge>
          </div>
        )}
        
        {/* Selection indicator */}
        {isSelected && (
          <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
            <div className="bg-primary text-primary-foreground px-3 py-1.5 rounded-full text-body-sm font-medium shadow-lg">
              Viewing
            </div>
          </div>
        )}
      </div>
      
      {/* Card Meta */}
      <div className="p-sm">
        <h3 className="text-body-sm font-semibold text-foreground truncate">
          {campaign.name}
        </h3>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-metadata text-muted-foreground truncate">
            {campaign.lp_type || campaign.campaign_type || "Campaign"}
          </span>
          {campaign.landing_page && (
            <a
              href={campaign.landing_page}
              target="_blank"
              rel="noopener noreferrer"
              className="text-metadata text-primary hover:underline inline-flex items-center gap-0.5 flex-shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              LP <ExternalLink className="h-2.5 w-2.5" />
            </a>
          )}
        </div>
      </div>
    </Card>
  );
}
