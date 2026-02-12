import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, AlertTriangle, TrendingUp, Shield, Target, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { AD_STRENGTH_THRESHOLDS } from "@/config/searchAdsConfig";
import { calculateAdStrength, checkAdRelevancy, checkIntentCatch, checkMENAPolicies, type QualityWarning } from "@/lib/adQualityScore";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface Sitelink {
  description: string;
  link: string;
}

interface SearchPlannerQualityPanelProps {
  headlines: string[];
  descriptions: string[];
  sitelinks: Sitelink[];
  callouts: string[];
  entity: string;
  keywords?: string[];
  matchTypes?: string[];
  adType?: "search" | "display" | "app";
  longHeadline?: string;
  shortHeadlines?: string[];
  ctaText?: string;
  appPlatform?: string;
  appCampaignGoal?: string;
  appStoreUrl?: string;
}

export function SearchPlannerQualityPanel({
  headlines,
  descriptions,
  sitelinks,
  callouts,
  entity,
  keywords = [],
  matchTypes = [],
  adType = "search",
  longHeadline,
  shortHeadlines = [],
  ctaText,
  appPlatform,
  appCampaignGoal,
  appStoreUrl,
}: SearchPlannerQualityPanelProps) {
  
  const adStrength = useMemo(() => {
    const validHeadlines = headlines.filter(h => h?.trim());
    const validDescriptions = descriptions.filter(d => d?.trim());
    const validSitelinks = sitelinks.filter(s => s?.description?.trim()).map(s => s.description);
    const validCallouts = callouts.filter(c => c?.trim());
    return calculateAdStrength(validHeadlines, validDescriptions, validSitelinks, validCallouts);
  }, [headlines, descriptions, sitelinks, callouts]);

  const relevancyWarnings = useMemo(() => {
    return checkAdRelevancy(headlines.filter(h => h?.trim()), descriptions.filter(d => d?.trim()));
  }, [headlines, descriptions]);

  const intentWarnings = useMemo(() => {
    return checkIntentCatch(headlines.filter(h => h?.trim()), keywords, matchTypes);
  }, [headlines, keywords, matchTypes]);

  const policyWarnings = useMemo(() => checkMENAPolicies(entity), [entity]);

  const score = typeof adStrength === 'number' ? adStrength : adStrength.score;
  const suggestions = typeof adStrength === 'object' ? (adStrength.suggestions || []) : [];
  
  const strengthLabel = useMemo(() => {
    if (score >= AD_STRENGTH_THRESHOLDS.excellent) return 'Excellent';
    if (score >= AD_STRENGTH_THRESHOLDS.good) return 'Good';
    if (score >= AD_STRENGTH_THRESHOLDS.average) return 'Average';
    return 'Poor';
  }, [score]);

  const strengthColor = useMemo(() => {
    if (score >= AD_STRENGTH_THRESHOLDS.excellent) return 'text-success';
    if (score >= AD_STRENGTH_THRESHOLDS.good) return 'text-primary';
    if (score >= AD_STRENGTH_THRESHOLDS.average) return 'text-warning';
    return 'text-destructive';
  }, [score]);

  const metrics = useMemo(() => {
    if (adType === 'display') {
      const validShortHeadlines = (shortHeadlines.length > 0 ? shortHeadlines : headlines).filter(h => h?.trim());
      const validDescriptions = descriptions.filter(d => d?.trim());
      return [
        { name: 'Short Headlines', current: validShortHeadlines.length, recommended: 5, status: validShortHeadlines.length >= 3 ? 'success' : validShortHeadlines.length >= 1 ? 'warning' : 'error' },
        { name: 'Descriptions', current: validDescriptions.length, recommended: 5, status: validDescriptions.length >= 3 ? 'success' : validDescriptions.length >= 1 ? 'warning' : 'error' },
        { name: 'Long Headline', current: longHeadline?.trim() ? 1 : 0, recommended: 1, status: longHeadline?.trim() ? 'success' : 'warning' },
        { name: 'CTA', current: ctaText?.trim() ? 1 : 0, recommended: 1, status: ctaText?.trim() ? 'success' : 'neutral' },
      ];
    }

    if (adType === 'app') {
      const validHeadlines = headlines.filter(h => h?.trim());
      const validDescriptions = descriptions.filter(d => d?.trim());
      return [
        { name: 'Headlines', current: validHeadlines.length, recommended: 5, status: validHeadlines.length >= 3 ? 'success' : validHeadlines.length >= 1 ? 'warning' : 'error' },
        { name: 'Descriptions', current: validDescriptions.length, recommended: 5, status: validDescriptions.length >= 3 ? 'success' : validDescriptions.length >= 1 ? 'warning' : 'error' },
        { name: 'Platform', current: appPlatform ? 1 : 0, recommended: 1, status: appPlatform ? 'success' : 'error' },
        { name: 'Goal', current: appCampaignGoal ? 1 : 0, recommended: 1, status: appCampaignGoal ? 'success' : 'error' },
        { name: 'Store URL', current: appStoreUrl ? 1 : 0, recommended: 1, status: appStoreUrl ? 'success' : 'warning' },
      ];
    }

    const validHeadlines = headlines.filter(h => h?.trim());
    const validDescriptions = descriptions.filter(d => d?.trim());
    const validSitelinks = sitelinks.filter(s => s?.description?.trim());
    const validCallouts = callouts.filter(c => c?.trim());
    
    return [
      { name: 'Headlines', current: validHeadlines.length, recommended: 15, status: validHeadlines.length >= 10 ? 'success' : validHeadlines.length >= 3 ? 'warning' : 'error' },
      { name: 'Descriptions', current: validDescriptions.length, recommended: 4, status: validDescriptions.length >= 4 ? 'success' : validDescriptions.length >= 2 ? 'warning' : 'error' },
      { name: 'Sitelinks', current: validSitelinks.length, recommended: 4, status: validSitelinks.length >= 4 ? 'success' : validSitelinks.length >= 2 ? 'warning' : 'neutral' },
      { name: 'Callouts', current: validCallouts.length, recommended: 4, status: validCallouts.length >= 4 ? 'success' : validCallouts.length >= 2 ? 'warning' : 'neutral' },
    ];
  }, [headlines, descriptions, sitelinks, callouts, adType, shortHeadlines, longHeadline, ctaText, appPlatform, appCampaignGoal, appStoreUrl]);

  return (
    <div className="p-md space-y-md">
      <Card className="bg-card border-border shadow-sm rounded-xl overflow-hidden">
        <CardHeader className="p-md pb-sm border-b border-border bg-card">
          <CardTitle className="text-body-sm font-semibold text-foreground flex items-center gap-xs">
            <TrendingUp className="h-4 w-4 text-primary" />
            Ad Strength
          </CardTitle>
        </CardHeader>
        <CardContent className="p-md space-y-md">
          {/* Score Display */}
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-xs">
              <span className={cn("text-heading-lg font-bold", strengthColor)}>{score}</span>
              <span className="text-metadata text-muted-foreground">/100</span>
            </div>
            <Badge variant={score >= AD_STRENGTH_THRESHOLDS.good ? "default" : "secondary"} className="text-metadata font-medium">
              {strengthLabel}
            </Badge>
          </div>

          {/* Progress Bar */}
          <div className="space-y-xs">
            <Progress value={score} className="h-2 bg-muted" />
            <div className="flex justify-between text-metadata text-muted-foreground">
              <span>Poor</span><span>Average</span><span>Good</span><span>Excellent</span>
            </div>
          </div>

          {/* Metrics Breakdown */}
          <div className="space-y-xs pt-sm border-t border-border">
            {metrics.map((metric, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-body-sm text-foreground">{metric.name}</span>
                <div className="flex items-center gap-xs">
                  <span className={cn(
                    "text-metadata font-medium",
                    metric.status === 'success' && 'text-success',
                    metric.status === 'warning' && 'text-warning',
                    metric.status === 'error' && 'text-destructive',
                    metric.status === 'neutral' && 'text-muted-foreground'
                  )}>
                    {metric.current}/{metric.recommended}
                  </span>
                  {metric.status === 'success' && <CheckCircle2 className="h-3.5 w-3.5 text-success" />}
                  {metric.status === 'warning' && <AlertTriangle className="h-3.5 w-3.5 text-warning" />}
                  {metric.status === 'error' && <AlertTriangle className="h-3.5 w-3.5 text-destructive" />}
                </div>
              </div>
            ))}
          </div>

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div className="space-y-xs pt-sm border-t border-border">
              <p className="text-metadata font-medium text-muted-foreground uppercase tracking-wide">Suggestions</p>
              <div className="space-y-xs">
                {suggestions.slice(0, 3).map((suggestion, i) => (
                  <div key={i} className="flex items-start gap-xs p-sm bg-muted/50 rounded-md">
                    <AlertTriangle className="h-3.5 w-3.5 text-warning mt-0.5 flex-shrink-0" />
                    <span className="text-metadata text-foreground">{suggestion}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Warning Sections (Search only) */}
          {adType === 'search' && (
            <>
              <WarningSection
                title="Ad Relevancy"
                icon={<Target className="h-3.5 w-3.5 text-primary" />}
                warnings={relevancyWarnings}
              />
              <WarningSection
                title="Intent Catch"
                icon={<Shield className="h-3.5 w-3.5 text-warning" />}
                warnings={intentWarnings}
              />
              <WarningSection
                title="MENA Policy"
                icon={<Globe className="h-3.5 w-3.5 text-info" />}
                warnings={policyWarnings}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Extracted warning section component
function WarningSection({ title, icon, warnings }: { title: string; icon: React.ReactNode; warnings: QualityWarning[] }) {
  if (warnings.length === 0) return null;

  return (
    <Collapsible defaultOpen className="pt-sm border-t border-border">
      <CollapsibleTrigger className="flex items-center gap-xs w-full text-left">
        {icon}
        <span className="text-metadata font-medium text-foreground flex-1">{title}</span>
        <Badge variant="outline" className="text-metadata">
          {warnings.length}
        </Badge>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-xs space-y-xs">
        {warnings.map((w, i) => (
          <div
            key={i}
            className={cn(
              "flex items-start gap-xs p-sm rounded-md text-metadata",
              w.severity === 'warning' ? 'bg-warning/10 border border-warning/30' : 'bg-info/10 border border-info/30'
            )}
          >
            <AlertTriangle className={cn("h-3.5 w-3.5 mt-0.5 flex-shrink-0", w.severity === 'warning' ? 'text-warning' : 'text-info')} />
            <span className="text-foreground">{w.message}</span>
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}
