import { ExternalCampaignCard } from "./ExternalCampaignCard";

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

interface ExternalCampaignGridProps {
  campaigns: Campaign[];
  versions: Version[];
  comments: ExternalComment[];
  expandedCampaignId: string | null;
  onToggleExpand: (campaignId: string) => void;
  onSubmitFeedback: (versionId: string, campaignId: string, text: string) => Promise<void>;
  submitting: { [key: string]: boolean };
  commentInputs: { [key: string]: string };
  onCommentChange: (versionId: string, value: string) => void;
}

export function ExternalCampaignGrid({
  campaigns,
  versions,
  comments,
  expandedCampaignId,
  onToggleExpand,
  onSubmitFeedback,
  submitting,
  commentInputs,
  onCommentChange,
}: ExternalCampaignGridProps) {
  return (
    <div className="grid gap-md grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {campaigns.map((campaign) => {
        const campaignVersions = versions
          .filter(v => v.utm_campaign_id === campaign.id)
          .sort((a, b) => b.version_number - a.version_number);
        
        const campaignComments = comments.filter(c => 
          campaignVersions.some(v => v.id === c.version_id)
        );

        return (
          <ExternalCampaignCard
            key={campaign.id}
            campaign={campaign}
            versions={campaignVersions}
            comments={campaignComments}
            isExpanded={expandedCampaignId === campaign.id}
            onToggle={() => onToggleExpand(campaign.id)}
            onSubmitFeedback={(versionId, text) => onSubmitFeedback(versionId, campaign.id, text)}
            submitting={submitting}
            commentInputs={commentInputs}
            onCommentChange={onCommentChange}
          />
        );
      })}
    </div>
  );
}
