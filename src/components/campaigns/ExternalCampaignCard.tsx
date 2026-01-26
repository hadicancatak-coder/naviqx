import { useState } from "react";
import { MessageSquare, ChevronDown, Image as ImageIcon, ExternalLink, Calendar } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ExternalVersionGallery } from "./ExternalVersionGallery";

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
  isExpanded: boolean;
  onToggle: () => void;
  onSubmitFeedback: (versionId: string, text: string) => Promise<void>;
  submitting: { [key: string]: boolean };
  commentInputs: { [key: string]: string };
  onCommentChange: (versionId: string, value: string) => void;
}

export function ExternalCampaignCard({
  campaign,
  versions,
  comments,
  isExpanded,
  onToggle,
  onSubmitFeedback,
  submitting,
  commentInputs,
  onCommentChange,
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
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <Card 
        className={cn(
          "overflow-hidden transition-smooth",
          isExpanded ? "ring-2 ring-primary/20" : "hover:shadow-soft hover:-translate-y-0.5"
        )}
      >
        <CollapsibleTrigger asChild>
          <div className="cursor-pointer">
            {/* Large Thumbnail */}
            <div className="relative aspect-[4/3] bg-muted overflow-hidden">
              {latestImage ? (
                <img
                  src={latestImage}
                  alt={campaign.name}
                  className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="h-12 w-12 text-muted-foreground" />
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
              
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity flex items-end justify-center pb-4">
                <span className="text-white text-body-sm font-medium flex items-center gap-1">
                  <ChevronDown className={cn(
                    "h-4 w-4 transition-transform",
                    isExpanded && "rotate-180"
                  )} />
                  {isExpanded ? "Collapse" : "View Details"}
                </span>
              </div>
            </div>
            
            {/* Card Meta */}
            <div className="p-md">
              <h3 className="text-heading-sm font-semibold text-foreground truncate">
                {campaign.name}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-metadata text-muted-foreground">
                  {campaign.lp_type || campaign.campaign_type || "Campaign"}
                </span>
                {campaign.landing_page && (
                  <a
                    href={campaign.landing_page}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-metadata text-primary hover:underline inline-flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    LP <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="border-t border-border">
            <ExternalVersionGallery
              versions={versions}
              comments={comments}
              onSubmitFeedback={onSubmitFeedback}
              submitting={submitting}
              commentInputs={commentInputs}
              onCommentChange={onCommentChange}
            />
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
