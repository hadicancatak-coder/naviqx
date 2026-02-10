import { useMemo } from "react";
import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface ChecklistItem {
  label: string;
  passed: boolean;
  recommended?: boolean; // yellow warning instead of red fail
}

interface GoogleParityChecklistProps {
  campaignType: string;
  campaign: {
    app_objective?: string | null;
    optimization_goal?: string | null;
    app_platform?: string | null;
    app_store_id?: string | null;
    audience_mode?: string | null;
    bidding_type?: string | null;
    display_objective?: string | null;
  };
  adGroups: {
    id: string;
    name: string;
    keywords?: unknown;
    ads: {
      headlines: unknown;
      descriptions: unknown;
      landing_page?: string | null;
      short_headlines?: unknown;
      long_headline?: string | null;
      business_name?: string | null;
    }[];
  }[];
}

function toArr(val: unknown): string[] {
  if (!Array.isArray(val)) return [];
  return val.filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
}

function hasKeywords(kw: unknown): boolean {
  if (!kw) return false;
  if (Array.isArray(kw)) return kw.length > 0;
  if (typeof kw === 'object') {
    return Object.values(kw as Record<string, unknown>).some(v => Array.isArray(v) && v.length > 0);
  }
  return false;
}

function getSearchChecklist(props: GoogleParityChecklistProps): ChecklistItem[] {
  const { adGroups } = props;
  const allAds = adGroups.flatMap(ag => ag.ads);
  const hasRSA = adGroups.every(ag => ag.ads.length >= 1);
  const has3Headlines = allAds.every(ad => toArr(ad.headlines).length >= 3);
  const has2Descriptions = allAds.every(ad => toArr(ad.descriptions).length >= 2);
  const hasFinalUrl = allAds.every(ad => !!ad.landing_page?.trim());
  const hasKw = adGroups.every(ag => hasKeywords(ag.keywords));

  return [
    { label: 'At least 1 RSA per ad group', passed: hasRSA },
    { label: '3+ headlines per RSA', passed: has3Headlines },
    { label: '2+ descriptions per RSA', passed: has2Descriptions },
    { label: 'Final URL set', passed: hasFinalUrl },
    { label: 'Keywords present', passed: hasKw },
  ];
}

function getAppChecklist(props: GoogleParityChecklistProps): ChecklistItem[] {
  const { campaign, adGroups } = props;
  const allAds = adGroups.flatMap(ag => ag.ads);
  const hasHeadline = allAds.some(ad => toArr(ad.headlines).length >= 1);
  const hasDesc = allAds.some(ad => toArr(ad.descriptions).length >= 1);

  return [
    { label: 'Objective selected', passed: !!campaign.app_objective },
    { label: 'Optimization goal selected', passed: !!campaign.optimization_goal },
    { label: 'App linked (platform + store ID)', passed: !!campaign.app_platform && !!campaign.app_store_id },
    { label: 'At least 1 headline', passed: hasHeadline },
    { label: 'At least 1 description', passed: hasDesc },
    { label: 'Audience mode defined', passed: !!campaign.audience_mode },
    { label: 'Bidding strategy defined', passed: !!campaign.bidding_type },
  ];
}

function getDisplayChecklist(props: GoogleParityChecklistProps): ChecklistItem[] {
  const { campaign, adGroups } = props;
  const allAds = adGroups.flatMap(ag => ag.ads);
  const hasShortHeadline = allAds.some(ad => {
    const sh = toArr(ad.short_headlines);
    const h = toArr(ad.headlines);
    return sh.length >= 1 || h.length >= 1;
  });
  const hasDesc = allAds.some(ad => toArr(ad.descriptions).length >= 1);
  const hasBusinessName = allAds.some(ad => !!ad.business_name?.trim());
  const hasLongHeadline = allAds.some(ad => !!ad.long_headline?.trim());

  return [
    { label: 'At least 1 short headline', passed: hasShortHeadline },
    { label: 'At least 1 description', passed: hasDesc },
    { label: 'Business name set', passed: hasBusinessName },
    { label: 'Long headline present', passed: hasLongHeadline, recommended: true },
    { label: 'Objective set', passed: !!campaign.display_objective },
  ];
}

export function GoogleParityChecklist(props: GoogleParityChecklistProps) {
  const items = useMemo(() => {
    switch (props.campaignType) {
      case 'app': return getAppChecklist(props);
      case 'display': return getDisplayChecklist(props);
      default: return getSearchChecklist(props);
    }
  }, [props]);

  const passedCount = items.filter(i => i.passed).length;

  return (
    <Collapsible defaultOpen={passedCount < items.length}>
      <CollapsibleTrigger className="flex items-center gap-xs w-full text-left p-sm rounded-lg hover:bg-card-hover transition-smooth">
        <CheckCircle2 className={cn(
          "h-4 w-4",
          passedCount === items.length ? "text-success" : "text-warning"
        )} />
        <span className="text-body-sm font-medium text-foreground flex-1">
          Google Parity Checklist
        </span>
        <span className="text-metadata text-muted-foreground">
          {passedCount}/{items.length}
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-xs px-sm pb-sm">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-sm py-xs">
            {item.passed ? (
              <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
            ) : item.recommended ? (
              <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0" />
            ) : (
              <XCircle className="h-4 w-4 text-destructive flex-shrink-0" />
            )}
            <span className={cn(
              "text-body-sm",
              item.passed ? "text-muted-foreground" : "text-foreground"
            )}>
              {item.label}
            </span>
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}
