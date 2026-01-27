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
  selectedCampaignId: string | null;
  onSelectCampaign: (campaignId: string | null) => void;
}

export function ExternalCampaignGrid({
  campaigns,
  versions,
  comments,
  selectedCampaignId,
  onSelectCampaign,
}: ExternalCampaignGridProps) {
  return (
    <div className="grid gap-md grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
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
            isSelected={selectedCampaignId === campaign.id}
            onSelect={() => onSelectCampaign(
              selectedCampaignId === campaign.id ? null : campaign.id
            )}
          />
        );
      })}
    </div>
  );
}
