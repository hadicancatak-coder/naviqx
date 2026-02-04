import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PublicAccessLink, PublicAccessComment } from "@/hooks/usePublicAccess";
import { ExternalCommentForm } from "./ExternalCommentForm";
import { ExternalCommentFeed } from "./ExternalCommentFeed";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { 
  ChevronDown, 
  ChevronRight, 
  Layers, 
  FolderOpen, 
  FileText,
  MessageSquare,
  Globe,
  Smartphone,
} from "lucide-react";
import type { Json } from "@/integrations/supabase/types";

interface SearchAdsReviewContentProps {
  accessData: PublicAccessLink;
  comments: PublicAccessComment[];
  actions: {
    submitComment: (params: {
      commentText: string;
      commentType?: string;
      resourceId?: string;
      metadata?: Record<string, unknown>;
    }) => void;
    isSubmitting: boolean;
  };
  canComment: boolean;
  reviewerName: string;
}

interface AdGroup {
  id: string;
  name: string;
  status: string | null;
  keywords: Json;
  ads: Ad[];
}

interface Campaign {
  id: string;
  name: string;
  status: string | null;
  entity: string | null;
  ad_groups: AdGroup[];
}

interface Ad {
  id: string;
  name: string;
  headlines: Json;
  descriptions: Json;
  sitelinks: Json;
  callouts: Json;
  business_name: string | null;
  landing_page: string | null;
  ad_strength: number | null;
  approval_status: string | null;
}

interface HeadlineOrDescription {
  text?: string;
  pinPosition?: string;
}

interface Sitelink {
  headline?: string;
  description1?: string;
  description2?: string;
  finalUrl?: string;
}

interface Callout {
  text?: string;
}

export function SearchAdsReviewContent({
  accessData,
  comments,
  actions,
  canComment,
  reviewerName,
}: SearchAdsReviewContentProps) {
  const entity = accessData.entity;

  // Fetch campaigns with ad groups and ads
  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['search-ads-external', entity],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('search_campaigns')
        .select(`
          id,
          name,
          status,
          entity,
          ad_groups (
            id,
            name,
            status,
            keywords,
            ads (
              id,
              name,
              headlines,
              descriptions,
              sitelinks,
              callouts,
              business_name,
              landing_page,
              ad_strength,
              approval_status
            )
          )
        `)
        .eq('entity', entity)
        .order('name');

      if (error) throw error;
      return (data || []) as Campaign[];
    },
    enabled: !!entity,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <div className="text-center py-16">
        <Layers className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
        <h2 className="text-heading-sm font-medium text-muted-foreground">
          No campaigns found
        </h2>
        <p className="text-body-sm text-muted-foreground mt-1">
          There are no search campaigns for {entity} yet.
        </p>
      </div>
    );
  }

  const totalAds = campaigns.reduce(
    (sum, c) => sum + c.ad_groups.reduce((s, g) => s + g.ads.length, 0),
    0
  );
  const totalAdGroups = campaigns.reduce((sum, c) => sum + c.ad_groups.length, 0);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="flex items-center gap-4 text-body-sm text-muted-foreground">
        <span className="flex items-center gap-1">
          <Layers className="w-4 h-4" />
          {campaigns.length} Campaign{campaigns.length !== 1 ? 's' : ''}
        </span>
        <span className="flex items-center gap-1">
          <FolderOpen className="w-4 h-4" />
          {totalAdGroups} Ad Group{totalAdGroups !== 1 ? 's' : ''}
        </span>
        <span className="flex items-center gap-1">
          <FileText className="w-4 h-4" />
          {totalAds} Ad{totalAds !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Entity-level feedback */}
      <Card className="p-4">
        <h3 className="text-body font-medium text-foreground mb-3 flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          General Feedback for {entity}
        </h3>
        <ExternalCommentForm
          onSubmit={actions.submitComment}
          isSubmitting={actions.isSubmitting}
          canComment={canComment}
          reviewerName={reviewerName}
          placeholder={`Share overall feedback for ${entity} search ads...`}
          commentType="entity_feedback"
        />
        <div className="mt-4">
          <ExternalCommentFeed
            comments={comments.filter((c) => c.comment_type === 'entity_feedback')}
            showEmpty={false}
          />
        </div>
      </Card>

      {/* Campaigns hierarchy */}
      <div className="space-y-4">
        {campaigns.map((campaign) => (
          <CampaignAccordion
            key={campaign.id}
            campaign={campaign}
            comments={comments}
            actions={actions}
            canComment={canComment}
            reviewerName={reviewerName}
          />
        ))}
      </div>
    </div>
  );
}

function CampaignAccordion({
  campaign,
  comments,
  actions,
  canComment,
  reviewerName,
}: {
  campaign: Campaign;
  comments: PublicAccessComment[];
  actions: SearchAdsReviewContentProps['actions'];
  canComment: boolean;
  reviewerName: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const adCount = campaign.ad_groups.reduce((sum, g) => sum + g.ads.length, 0);

  return (
    <Card className="overflow-hidden">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-card-hover transition-colors">
          <div className="flex items-center gap-3">
            {isOpen ? (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            )}
            <div className="text-left">
              <h3 className="text-body font-medium text-foreground">
                {campaign.name}
              </h3>
              <p className="text-metadata text-muted-foreground">
                {campaign.ad_groups.length} ad group{campaign.ad_groups.length !== 1 ? 's' : ''} · {adCount} ad{adCount !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'}>
            {campaign.status || 'draft'}
          </Badge>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t border-border px-4 pb-4 space-y-4">
            {campaign.ad_groups.map((adGroup) => (
              <AdGroupSection
                key={adGroup.id}
                adGroup={adGroup}
                campaignId={campaign.id}
                comments={comments}
                actions={actions}
                canComment={canComment}
                reviewerName={reviewerName}
              />
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

function AdGroupSection({
  adGroup,
  campaignId,
  comments,
  actions,
  canComment,
  reviewerName,
}: {
  adGroup: AdGroup;
  campaignId: string;
  comments: PublicAccessComment[];
  actions: SearchAdsReviewContentProps['actions'];
  canComment: boolean;
  reviewerName: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mt-4 first:mt-0">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="w-full p-3 bg-muted/50 rounded-lg flex items-center justify-between hover:bg-muted transition-colors">
          <div className="flex items-center gap-2">
            {isOpen ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
            <FolderOpen className="w-4 h-4 text-muted-foreground" />
            <span className="text-body-sm font-medium">{adGroup.name}</span>
          </div>
          <span className="text-metadata text-muted-foreground">
            {adGroup.ads.length} ad{adGroup.ads.length !== 1 ? 's' : ''}
          </span>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="mt-3 space-y-4 pl-6">
            {adGroup.ads.map((ad) => (
              <AdPreviewCard
                key={ad.id}
                ad={ad}
                campaignId={campaignId}
                adGroupId={adGroup.id}
                comments={comments}
                actions={actions}
                canComment={canComment}
                reviewerName={reviewerName}
              />
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

function AdPreviewCard({
  ad,
  campaignId,
  adGroupId,
  comments,
  actions,
  canComment,
  reviewerName,
}: {
  ad: Ad;
  campaignId: string;
  adGroupId: string;
  comments: PublicAccessComment[];
  actions: SearchAdsReviewContentProps['actions'];
  canComment: boolean;
  reviewerName: string;
}) {
  const [showFeedback, setShowFeedback] = useState(false);
  
  const headlines = (ad.headlines as HeadlineOrDescription[] || []).filter(h => h?.text);
  const descriptions = (ad.descriptions as HeadlineOrDescription[] || []).filter(d => d?.text);
  const sitelinks = (ad.sitelinks as Sitelink[] || []).filter(s => s?.headline);
  const callouts = (ad.callouts as Callout[] || []).filter(c => c?.text);
  
  const adComments = comments.filter(
    (c) => c.resource_id === ad.id && c.comment_type === 'ad_feedback'
  );

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card">
      {/* Ad header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-muted/30">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <span className="text-body-sm font-medium">{ad.name}</span>
        </div>
        <div className="flex items-center gap-2">
          {ad.ad_strength !== null && (
            <Badge variant="outline" className="text-metadata">
              Strength: {ad.ad_strength}/5
            </Badge>
          )}
          <Badge variant={ad.approval_status === 'approved' ? 'default' : 'secondary'}>
            {ad.approval_status || 'pending'}
          </Badge>
        </div>
      </div>

      {/* Preview tabs */}
      <div className="grid md:grid-cols-2 gap-4 p-4">
        {/* Desktop Preview */}
        <div>
          <div className="flex items-center gap-2 mb-2 text-metadata text-muted-foreground">
            <Globe className="w-3 h-3" />
            Desktop Preview
          </div>
          <div className="border border-border rounded-lg p-4 bg-white text-black">
            <GoogleAdPreview
              headlines={headlines}
              descriptions={descriptions}
              sitelinks={sitelinks}
              callouts={callouts}
              businessName={ad.business_name}
              landingPage={ad.landing_page}
              variant="desktop"
            />
          </div>
        </div>

        {/* Mobile Preview */}
        <div>
          <div className="flex items-center gap-2 mb-2 text-metadata text-muted-foreground">
            <Smartphone className="w-3 h-3" />
            Mobile Preview
          </div>
          <div className="border border-border rounded-lg p-4 bg-white text-black max-w-[320px]">
            <GoogleAdPreview
              headlines={headlines}
              descriptions={descriptions}
              sitelinks={sitelinks}
              callouts={callouts}
              businessName={ad.business_name}
              landingPage={ad.landing_page}
              variant="mobile"
            />
          </div>
        </div>
      </div>

      {/* Feedback section */}
      <div className="px-4 pb-4">
        <button
          type="button"
          onClick={() => setShowFeedback(!showFeedback)}
          className="flex items-center gap-2 text-body-sm text-primary hover:underline"
        >
          <MessageSquare className="w-4 h-4" />
          {adComments.length > 0
            ? `${adComments.length} comment${adComments.length !== 1 ? 's' : ''}`
            : 'Leave feedback'}
        </button>

        {showFeedback && (
          <div className="mt-3 space-y-3">
            <ExternalCommentFeed comments={adComments} showEmpty={false} />
            <ExternalCommentForm
              onSubmit={actions.submitComment}
              isSubmitting={actions.isSubmitting}
              canComment={canComment}
              reviewerName={reviewerName}
              placeholder="Feedback on this ad..."
              commentType="ad_feedback"
              resourceId={ad.id}
              metadata={{ campaignId, adGroupId }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// Simplified Google Ad Preview component for external page
function GoogleAdPreview({
  headlines,
  descriptions,
  sitelinks,
  callouts,
  businessName,
  landingPage,
  variant,
}: {
  headlines: HeadlineOrDescription[];
  descriptions: HeadlineOrDescription[];
  sitelinks: Sitelink[];
  callouts: Callout[];
  businessName: string | null;
  landingPage: string | null;
  variant: 'desktop' | 'mobile';
}) {
  const displayHeadlines = headlines.slice(0, variant === 'desktop' ? 3 : 2);
  const displayDescriptions = descriptions.slice(0, variant === 'desktop' ? 2 : 1);
  const displaySitelinks = sitelinks.slice(0, variant === 'desktop' ? 4 : 2);

  let displayUrl = 'example.com';
  try {
    if (landingPage) {
      displayUrl = new URL(landingPage).hostname;
    }
  } catch {
    // Keep default
  }

  return (
    <div className="font-sans text-sm">
      {/* Sponsored label */}
      <div className="text-xs text-gray-500 mb-1">Sponsored</div>
      
      {/* Display URL */}
      <div className="flex items-center gap-1 text-xs mb-1">
        <span className="text-green-700">{displayUrl}</span>
      </div>
      
      {/* Headlines */}
      <div className="text-blue-600 hover:underline cursor-pointer text-base font-normal leading-tight">
        {displayHeadlines.map((h, i) => (
          <span key={i}>
            {h.text}
            {i < displayHeadlines.length - 1 && ' | '}
          </span>
        ))}
      </div>
      
      {/* Descriptions */}
      <div className="text-gray-700 mt-1 text-sm leading-relaxed">
        {displayDescriptions.map((d, i) => (
          <span key={i}>
            {d.text}
            {i < displayDescriptions.length - 1 && ' '}
          </span>
        ))}
      </div>
      
      {/* Callouts */}
      {callouts.length > 0 && (
        <div className="text-gray-600 text-xs mt-2">
          {callouts.slice(0, 4).map((c, i) => (
            <span key={i}>
              {c.text}
              {i < Math.min(callouts.length, 4) - 1 && ' · '}
            </span>
          ))}
        </div>
      )}
      
      {/* Sitelinks */}
      {displaySitelinks.length > 0 && (
        <div className={`mt-2 ${variant === 'desktop' ? 'grid grid-cols-2 gap-2' : 'space-y-1'}`}>
          {displaySitelinks.map((s, i) => (
            <div key={i} className="text-blue-600 text-xs hover:underline cursor-pointer">
              {s.headline}
            </div>
          ))}
        </div>
      )}
      
      {/* Business name */}
      {businessName && (
        <div className="text-gray-500 text-xs mt-2">
          {businessName}
        </div>
      )}
    </div>
  );
}
