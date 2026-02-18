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
  Search,
  Monitor,
  ImageIcon,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Json } from "@/integrations/supabase/types";

// ── Helpers ──────────────────────────────────────────────
/** Normalize DB arrays that can be string[] or {text:string}[] */
const toDisplayArray = (arr: unknown): string[] => {
  if (!Array.isArray(arr)) return [];
  return arr.map(item => typeof item === 'string' ? item : item?.text || '').filter(Boolean);
};

/** Normalize sitelinks that can be {description,link} or {headline,description1,finalUrl} */
const toSitelinkArray = (arr: unknown): { label: string; url: string }[] => {
  if (!Array.isArray(arr)) return [];
  return arr
    .map(item => {
      if (!item || typeof item !== 'object') return null;
      const label = item.headline || item.description || item.text || '';
      const url = item.finalUrl || item.link || '';
      return label ? { label, url } : null;
    })
    .filter(Boolean) as { label: string; url: string }[];
};

// ── Types ────────────────────────────────────────────────
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
  campaign_type: string | null;
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
  ad_type: string | null;
  long_headline: string | null;
  short_headlines: Json | null;
  cta_text: string | null;
}

const CAMPAIGN_TYPE_COLORS: Record<string, string> = {
  search: "bg-info-soft text-info-text",
  display: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  app: "bg-success-soft text-success-text",
};

// ── Main Component ───────────────────────────────────────
export function SearchAdsReviewContent({
  accessData,
  comments,
  actions,
  canComment,
  reviewerName,
}: SearchAdsReviewContentProps) {
  const entity = accessData.entity;
  const metadata = (accessData.metadata || {}) as Record<string, unknown>;
  const scope = (metadata.scope as string) || "entity";
  const resourceId = accessData.resource_id;

  // Fetch campaigns with ad groups and ads — scope-aware
  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['search-ads-external', entity, scope, resourceId],
    queryFn: async () => {
      if (scope === "ad_group" && resourceId) {
        // Fetch just the ad group + its parent campaign
        const { data: agData } = await supabase
          .from('ad_groups')
          .select(`id, name, status, keywords, campaign_id, ads (id, name, headlines, descriptions, sitelinks, callouts, business_name, landing_page, ad_strength, approval_status, ad_type, long_headline, short_headlines, cta_text)`)
          .eq('id', resourceId)
          .single();

        if (!agData) return [];

        const { data: campData } = await supabase
          .from('search_campaigns')
          .select('id, name, status, entity, campaign_type')
          .eq('id', agData.campaign_id)
          .single();

        if (!campData) return [];

        return [{
          ...campData,
          ad_groups: [{ id: agData.id, name: agData.name, status: agData.status, keywords: agData.keywords, ads: (agData.ads || []) as Ad[] }],
        }] as Campaign[];
      }

      let query = supabase
        .from('search_campaigns')
        .select(`id, name, status, entity, campaign_type, ad_groups (id, name, status, keywords, ads (id, name, headlines, descriptions, sitelinks, callouts, business_name, landing_page, ad_strength, approval_status, ad_type, long_headline, short_headlines, cta_text))`)
        .eq('entity', entity)
        .order('name');

      if (scope === "campaign" && resourceId) {
        query = query.eq('id', resourceId);
      }

      const { data, error } = await query;
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
        <h2 className="text-heading-sm font-medium text-muted-foreground">No campaigns found</h2>
        <p className="text-body-sm text-muted-foreground mt-1">There are no search campaigns for {entity} yet.</p>
      </div>
    );
  }

  const totalAds = campaigns.reduce((sum, c) => sum + c.ad_groups.reduce((s, g) => s + g.ads.length, 0), 0);
  const totalAdGroups = campaigns.reduce((sum, c) => sum + c.ad_groups.length, 0);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="flex items-center gap-4 text-body-sm text-muted-foreground">
        <span className="flex items-center gap-1"><Layers className="w-4 h-4" />{campaigns.length} Campaign{campaigns.length !== 1 ? 's' : ''}</span>
        <span className="flex items-center gap-1"><FolderOpen className="w-4 h-4" />{totalAdGroups} Ad Group{totalAdGroups !== 1 ? 's' : ''}</span>
        <span className="flex items-center gap-1"><FileText className="w-4 h-4" />{totalAds} Ad{totalAds !== 1 ? 's' : ''}</span>
      </div>

      {/* Entity-level feedback */}
      <Card className="p-4">
        <h3 className="text-body font-medium text-foreground mb-3 flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />General Feedback for {entity}
        </h3>
        <ExternalCommentForm onSubmit={actions.submitComment} isSubmitting={actions.isSubmitting} canComment={canComment} reviewerName={reviewerName} placeholder={`Share overall feedback for ${entity} search ads...`} commentType="entity_feedback" />
        <div className="mt-4">
          <ExternalCommentFeed comments={comments.filter((c) => c.comment_type === 'entity_feedback')} showEmpty={false} />
        </div>
      </Card>

      {/* Campaigns hierarchy */}
      <div className="space-y-4">
        {campaigns.map((campaign) => (
          <CampaignAccordion key={campaign.id} campaign={campaign} comments={comments} actions={actions} canComment={canComment} reviewerName={reviewerName} />
        ))}
      </div>
    </div>
  );
}

// ── Campaign Accordion ───────────────────────────────────
function CampaignAccordion({ campaign, comments, actions, canComment, reviewerName }: {
  campaign: Campaign;
  comments: PublicAccessComment[];
  actions: SearchAdsReviewContentProps['actions'];
  canComment: boolean;
  reviewerName: string;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const adCount = campaign.ad_groups.reduce((sum, g) => sum + g.ads.length, 0);
  const campaignType = campaign.campaign_type || 'search';
  const TypeIcon = campaignType === 'display' ? Monitor : campaignType === 'app' ? Smartphone : Search;

  return (
    <Card className="overflow-hidden">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-card-hover transition-colors">
          <div className="flex items-center gap-3">
            {isOpen ? <ChevronDown className="w-5 h-5 text-muted-foreground" /> : <ChevronRight className="w-5 h-5 text-muted-foreground" />}
            <div className="text-left">
              <h3 className="text-body font-medium text-foreground">{campaign.name}</h3>
              <p className="text-metadata text-muted-foreground">
                {campaign.ad_groups.length} ad group{campaign.ad_groups.length !== 1 ? 's' : ''} · {adCount} ad{adCount !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={cn("text-metadata capitalize", CAMPAIGN_TYPE_COLORS[campaignType])}>
              <TypeIcon className="h-3 w-3 mr-1" />
              {campaignType}
            </Badge>
            <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'}>
              {campaign.status || 'draft'}
            </Badge>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t border-border px-4 pb-4 space-y-4">
            {campaign.ad_groups.map((adGroup) => (
              <AdGroupSection key={adGroup.id} adGroup={adGroup} campaignId={campaign.id} campaignType={campaignType} comments={comments} actions={actions} canComment={canComment} reviewerName={reviewerName} />
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

// ── Ad Group Section ─────────────────────────────────────
function AdGroupSection({ adGroup, campaignId, campaignType, comments, actions, canComment, reviewerName }: {
  adGroup: AdGroup;
  campaignId: string;
  campaignType: string;
  comments: PublicAccessComment[];
  actions: SearchAdsReviewContentProps['actions'];
  canComment: boolean;
  reviewerName: string;
}) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="mt-4 first:mt-0">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="w-full p-3 bg-muted/50 rounded-lg flex items-center justify-between hover:bg-muted transition-colors">
          <div className="flex items-center gap-2">
            {isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
            <FolderOpen className="w-4 h-4 text-muted-foreground" />
            <span className="text-body-sm font-medium">{adGroup.name}</span>
          </div>
          <span className="text-metadata text-muted-foreground">{adGroup.ads.length} ad{adGroup.ads.length !== 1 ? 's' : ''}</span>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="mt-3 space-y-4 pl-6">
            {adGroup.ads.length === 0 ? (
              <p className="text-body-sm text-muted-foreground py-4 text-center">No ads in this ad group yet.</p>
            ) : (
              adGroup.ads.map((ad) => (
                <AdPreviewCard key={ad.id} ad={ad} campaignId={campaignId} adGroupId={adGroup.id} campaignType={campaignType} comments={comments} actions={actions} canComment={canComment} reviewerName={reviewerName} />
              ))
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

// ── Ad Preview Card ──────────────────────────────────────
function AdPreviewCard({ ad, campaignId, adGroupId, campaignType, comments, actions, canComment, reviewerName }: {
  ad: Ad;
  campaignId: string;
  adGroupId: string;
  campaignType: string;
  comments: PublicAccessComment[];
  actions: SearchAdsReviewContentProps['actions'];
  canComment: boolean;
  reviewerName: string;
}) {
  const [showFeedback, setShowFeedback] = useState(false);

  const headlines = toDisplayArray(ad.headlines);
  const descriptions = toDisplayArray(ad.descriptions);
  const sitelinks = toSitelinkArray(ad.sitelinks);
  const callouts = toDisplayArray(ad.callouts);
  const adType = ad.ad_type || campaignType || 'search';

  const adComments = comments.filter((c) => c.resource_id === ad.id && c.comment_type === 'ad_feedback');

  const hasContent = headlines.length > 0 || descriptions.length > 0;

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
            <Badge variant="outline" className="text-metadata">Strength: {ad.ad_strength}/5</Badge>
          )}
          <Badge variant={ad.approval_status === 'approved' ? 'default' : 'secondary'}>
            {ad.approval_status || 'pending'}
          </Badge>
        </div>
      </div>

      {/* Preview content */}
      {!hasContent ? (
        <div className="p-8 text-center text-muted-foreground">
          <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-body-sm">No ad content yet</p>
        </div>
      ) : adType === 'display' ? (
        <DisplayAdPreview ad={ad} headlines={headlines} descriptions={descriptions} />
      ) : adType === 'app' ? (
        <AppAdPreview ad={ad} headlines={headlines} descriptions={descriptions} />
      ) : (
        <div className="grid md:grid-cols-2 gap-4 p-4">
          <div>
            <div className="flex items-center gap-2 mb-2 text-metadata text-muted-foreground"><Globe className="w-3 h-3" />Desktop Preview</div>
            <div className="border border-border rounded-lg p-4 bg-white text-black">
              <GoogleSearchPreview headlines={headlines} descriptions={descriptions} sitelinks={sitelinks} callouts={callouts} businessName={ad.business_name} landingPage={ad.landing_page} variant="desktop" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2 text-metadata text-muted-foreground"><Smartphone className="w-3 h-3" />Mobile Preview</div>
            <div className="border border-border rounded-lg p-4 bg-white text-black max-w-[320px]">
              <GoogleSearchPreview headlines={headlines} descriptions={descriptions} sitelinks={sitelinks} callouts={callouts} businessName={ad.business_name} landingPage={ad.landing_page} variant="mobile" />
            </div>
          </div>
        </div>
      )}

      {/* Feedback section */}
      <div className="px-4 pb-4">
        <button type="button" onClick={() => setShowFeedback(!showFeedback)} className="flex items-center gap-2 text-body-sm text-primary hover:underline">
          <MessageSquare className="w-4 h-4" />
          {adComments.length > 0 ? `${adComments.length} comment${adComments.length !== 1 ? 's' : ''}` : 'Leave feedback'}
        </button>
        {showFeedback && (
          <div className="mt-3 space-y-3">
            <ExternalCommentFeed comments={adComments} showEmpty={false} />
            <ExternalCommentForm onSubmit={actions.submitComment} isSubmitting={actions.isSubmitting} canComment={canComment} reviewerName={reviewerName} placeholder="Feedback on this ad..." commentType="ad_feedback" resourceId={ad.id} metadata={{ campaignId, adGroupId }} />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Google Search Preview (SERP) ─────────────────────────
function GoogleSearchPreview({ headlines, descriptions, sitelinks, callouts, businessName, landingPage, variant }: {
  headlines: string[];
  descriptions: string[];
  sitelinks: { label: string; url: string }[];
  callouts: string[];
  businessName: string | null;
  landingPage: string | null;
  variant: 'desktop' | 'mobile';
}) {
  const displayHeadlines = headlines.slice(0, variant === 'desktop' ? 3 : 2);
  const displayDescriptions = descriptions.slice(0, variant === 'desktop' ? 2 : 1);
  const displaySitelinks = sitelinks.slice(0, variant === 'desktop' ? 4 : 2);

  let displayUrl = 'example.com';
  try {
    if (landingPage) displayUrl = new URL(landingPage).hostname;
  } catch { /* keep default */ }

  return (
    <div className="font-sans text-sm">
      <div className="text-xs text-gray-500 mb-1">Sponsored</div>
      <div className="flex items-center gap-1 text-xs mb-1">
        <span className="text-green-700">{displayUrl}</span>
      </div>
      <div className="text-blue-600 hover:underline cursor-pointer text-base font-normal leading-tight">
        {displayHeadlines.map((h, i) => (
          <span key={i}>{h}{i < displayHeadlines.length - 1 && ' | '}</span>
        ))}
      </div>
      <div className="text-gray-700 mt-1 text-sm leading-relaxed">
        {displayDescriptions.map((d, i) => (
          <span key={i}>{d}{i < displayDescriptions.length - 1 && ' '}</span>
        ))}
      </div>
      {callouts.length > 0 && (
        <div className="text-gray-600 text-xs mt-2">
          {callouts.slice(0, 4).map((c, i) => (
            <span key={i}>{c}{i < Math.min(callouts.length, 4) - 1 && ' · '}</span>
          ))}
        </div>
      )}
      {displaySitelinks.length > 0 && (
        <div className={`mt-2 ${variant === 'desktop' ? 'grid grid-cols-2 gap-2' : 'space-y-1'}`}>
          {displaySitelinks.map((s, i) => (
            <div key={i} className="text-blue-600 text-xs hover:underline cursor-pointer">{s.label}</div>
          ))}
        </div>
      )}
      {businessName && <div className="text-gray-500 text-xs mt-2">{businessName}</div>}
    </div>
  );
}

// ── Display Ad Preview ───────────────────────────────────
function DisplayAdPreview({ ad, headlines, descriptions }: { ad: Ad; headlines: string[]; descriptions: string[] }) {
  const longHeadline = ad.long_headline || '';
  const shortHeadlines = toDisplayArray(ad.short_headlines);

  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-3 text-metadata text-muted-foreground">
        <Monitor className="w-3 h-3" />
        Display Ad Preview
      </div>
      <div className="border border-border rounded-xl overflow-hidden bg-white text-black">
        {/* Image placeholder */}
        <div className="bg-gradient-to-br from-gray-100 to-gray-200 h-40 flex items-center justify-center">
          <ImageIcon className="w-12 h-12 text-gray-400" />
        </div>
        <div className="p-4 space-y-2">
          {longHeadline && <h3 className="font-semibold text-base leading-tight">{longHeadline}</h3>}
          {shortHeadlines.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {shortHeadlines.slice(0, 3).map((h, i) => (
                <span key={i} className="text-sm text-gray-700">{h}{i < Math.min(shortHeadlines.length, 3) - 1 && ' · '}</span>
              ))}
            </div>
          )}
          {headlines.length > 0 && !longHeadline && (
            <h3 className="font-semibold text-base leading-tight">{headlines[0]}</h3>
          )}
          {descriptions.length > 0 && (
            <p className="text-sm text-gray-600">{descriptions[0]}</p>
          )}
          {ad.cta_text && (
            <button className="mt-2 px-4 py-1.5 bg-blue-600 text-white text-sm rounded-full font-medium">{ad.cta_text}</button>
          )}
          <div className="text-xs text-gray-400 mt-1">Ad · {ad.business_name || 'Advertiser'}</div>
        </div>
      </div>
    </div>
  );
}

// ── App Ad Preview ───────────────────────────────────────
function AppAdPreview({ ad, headlines, descriptions }: { ad: Ad; headlines: string[]; descriptions: string[] }) {
  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-3 text-metadata text-muted-foreground">
        <Smartphone className="w-3 h-3" />
        App Install Ad Preview
      </div>
      <div className="border border-border rounded-xl overflow-hidden bg-white text-black max-w-sm">
        <div className="p-4">
          <div className="flex items-start gap-3">
            {/* App icon placeholder */}
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center flex-shrink-0">
              <Smartphone className="w-7 h-7 text-primary" />
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              {headlines.length > 0 && <h3 className="font-semibold text-sm leading-tight">{headlines[0]}</h3>}
              {descriptions.length > 0 && <p className="text-xs text-gray-600 line-clamp-2">{descriptions[0]}</p>}
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <span>★★★★☆</span>
                <span>4.5</span>
              </div>
            </div>
          </div>
          {headlines.length > 1 && (
            <p className="text-xs text-gray-500 mt-2">{headlines[1]}</p>
          )}
        </div>
        <div className="border-t border-gray-100 px-4 py-3 flex items-center justify-between">
          <span className="text-xs text-gray-400">Ad · {ad.business_name || 'Advertiser'}</span>
          <button className="flex items-center gap-1 px-4 py-1.5 bg-green-600 text-white text-sm rounded-full font-medium">
            <Download className="w-3 h-3" />
            Install
          </button>
        </div>
      </div>
    </div>
  );
}
