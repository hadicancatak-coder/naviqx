import { X, ExternalLink, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ExternalVersionGallery } from "./ExternalVersionGallery";
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

interface Campaign {
  id: string;
  name: string;
  lp_type?: string;
  campaign_type?: string;
  landing_page?: string;
}

interface ExternalCampaignDetailPanelProps {
  campaign: Campaign;
  versions: Version[];
  comments: ExternalComment[];
  onClose: () => void;
  onSubmitFeedback: (versionId: string, campaignId: string, text: string) => Promise<void>;
  submitting: { [key: string]: boolean };
  commentInputs: { [key: string]: string };
  onCommentChange: (versionId: string, value: string) => void;
}

export function ExternalCampaignDetailPanel({
  campaign,
  versions,
  comments,
  onClose,
  onSubmitFeedback,
  submitting,
  commentInputs,
  onCommentChange,
}: ExternalCampaignDetailPanelProps) {
  // Filter comments for this campaign's versions
  const campaignComments = comments.filter(c => 
    versions.some(v => v.id === c.version_id)
  );

  return (
    <Card className="liquid-glass-elevated overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-md p-md border-b border-border bg-muted/30">
        <div className="flex items-center gap-md min-w-0">
          <div className="min-w-0">
            <h2 className="text-heading-md font-semibold text-foreground truncate">
              {campaign.name}
            </h2>
            <div className="flex items-center gap-sm mt-1 flex-wrap">
              <Badge variant="secondary" className="text-metadata">
                {campaign.lp_type || campaign.campaign_type || "Campaign"}
              </Badge>
              <span className="text-metadata text-muted-foreground">
                {versions.length} version{versions.length !== 1 ? 's' : ''}
              </span>
              {campaignComments.length > 0 && (
                <span className="text-metadata text-muted-foreground">
                  • {campaignComments.length} comment{campaignComments.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-sm flex-shrink-0">
          {campaign.landing_page && (
            <Button
              variant="outline"
              size="sm"
              asChild
            >
              <a
                href={campaign.landing_page}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View LP
              </a>
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-9 w-9"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Version Gallery - Full Width */}
      <div className="p-lg">
        {versions.length > 0 ? (
          <ExternalVersionGallery
            versions={versions}
            comments={campaignComments}
            onSubmitFeedback={(versionId, text) => onSubmitFeedback(versionId, campaign.id, text)}
            submitting={submitting}
            commentInputs={commentInputs}
            onCommentChange={onCommentChange}
            expanded
          />
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-body">No versions available for this campaign yet.</p>
          </div>
        )}
      </div>
    </Card>
  );
}
