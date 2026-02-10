import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Monitor, Smartphone, ChevronLeft, ChevronRight, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { DisplayAdPreview } from "@/components/ads/DisplayAdPreview";
import { AppAdPreview } from "@/components/ads/AppAdPreview";

interface Sitelink {
  description: string;
  link: string;
}

interface SearchPlannerPreviewPanelProps {
  headlines: string[];
  descriptions: string[];
  landingPage: string;
  businessName: string;
  sitelinks: Sitelink[];
  callouts: string[];
  adType?: "search" | "display" | "app";
  // Display fields
  longHeadline?: string;
  shortHeadlines?: string[];
  ctaText?: string;
  // App fields
  appPlatform?: string;
  appCampaignGoal?: string;
  appStoreUrl?: string;
}

export function SearchPlannerPreviewPanel({
  headlines,
  descriptions,
  landingPage,
  businessName,
  sitelinks,
  callouts,
  adType = "search",
  longHeadline = "",
  shortHeadlines = [],
  ctaText = "",
  appPlatform = "",
  appCampaignGoal = "",
  appStoreUrl = "",
}: SearchPlannerPreviewPanelProps) {
  // Display ad preview
  if (adType === "display") {
    return (
      <DisplayAdPreview
        longHeadline={longHeadline}
        shortHeadlines={shortHeadlines}
        descriptions={descriptions}
        ctaText={ctaText}
        landingPage={landingPage}
        businessName={businessName}
      />
    );
  }

  // App ad preview
  if (adType === "app") {
    return (
      <AppAdPreview
        headlines={headlines}
        descriptions={descriptions}
        ctaText={ctaText}
        businessName={businessName}
        appPlatform={appPlatform}
        appCampaignGoal={appCampaignGoal}
        appStoreUrl={appStoreUrl}
      />
    );
  }

  // Search ad preview (existing)
  return <SearchAdPreviewPanel
    headlines={headlines}
    descriptions={descriptions}
    landingPage={landingPage}
    businessName={businessName}
    sitelinks={sitelinks}
    callouts={callouts}
  />;
}

// Extracted search preview into its own component
function SearchAdPreviewPanel({ headlines, descriptions, landingPage, businessName, sitelinks, callouts }: {
  headlines: string[]; descriptions: string[]; landingPage: string; businessName: string; sitelinks: Sitelink[]; callouts: string[];
}) {
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [currentCombinationIndex, setCurrentCombinationIndex] = useState(0);
  
  const combinations = useMemo(() => {
    const validHeadlines = headlines.filter(h => h?.trim());
    const validDescriptions = descriptions.filter(d => d?.trim());
    if (validHeadlines.length === 0) return [{ headlines: [], descriptions: validDescriptions.slice(0, 2) }];
    const getRandomElements = (arr: string[], count: number) => [...arr].sort(() => Math.random() - 0.5).slice(0, Math.min(count, arr.length));
    const result = [];
    const maxCombinations = Math.min(10, Math.max(1, validHeadlines.length));
    for (let i = 0; i < maxCombinations; i++) {
      result.push({ headlines: getRandomElements(validHeadlines, 3), descriptions: getRandomElements(validDescriptions, 2) });
    }
    return result;
  }, [headlines, descriptions]);

  const currentCombination = combinations[currentCombinationIndex] || {
    headlines: headlines.filter(h => h?.trim()).slice(0, 3),
    descriptions: descriptions.filter(d => d?.trim()).slice(0, 2),
  };

  const validSitelinks = sitelinks.filter(s => s?.description?.trim() || s?.link?.trim());
  const validCallouts = callouts.filter(c => c?.trim());
  const displayUrl = landingPage ? landingPage.replace(/^https?:\/\//, '').split('/')[0] : 'example.com';

  return (
    <div className="p-md">
      <Card className="bg-card border-border shadow-sm rounded-xl overflow-hidden">
        <CardHeader className="p-md pb-sm border-b border-border bg-card">
          <div className="flex items-center justify-between">
            <CardTitle className="text-body-sm font-semibold text-foreground flex items-center gap-xs">
              <Globe className="h-4 w-4 text-primary" />
              Live Preview
            </CardTitle>
            <Tabs value={previewMode} onValueChange={(v) => setPreviewMode(v as 'desktop' | 'mobile')}>
              <TabsList className="h-8 bg-muted p-xs">
                <TabsTrigger value="desktop" className="h-6 px-sm text-metadata data-[state=active]:bg-card data-[state=active]:shadow-sm">
                  <Monitor className="h-3.5 w-3.5" />
                </TabsTrigger>
                <TabsTrigger value="mobile" className="h-6 px-sm text-metadata data-[state=active]:bg-card data-[state=active]:shadow-sm">
                  <Smartphone className="h-3.5 w-3.5" />
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          {combinations.length > 1 && (
            <div className="flex items-center justify-between mt-sm">
              <Badge variant="outline" className="text-metadata">
                Combination {currentCombinationIndex + 1}/{combinations.length}
              </Badge>
              <div className="flex items-center gap-xs">
                <Button variant="ghost" size="icon-xs" onClick={() => setCurrentCombinationIndex(prev => prev === 0 ? combinations.length - 1 : prev - 1)}>
                  <ChevronLeft />
                </Button>
                <Button variant="ghost" size="icon-xs" onClick={() => setCurrentCombinationIndex(prev => (prev + 1) % combinations.length)}>
                  <ChevronRight />
                </Button>
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent className="p-md">
          <div className={cn("bg-background border border-border rounded-lg p-md transition-smooth", previewMode === 'mobile' && "max-w-[320px] mx-auto")}>
            <div className="flex items-center gap-xs mb-xs">
              <Badge variant="outline" className="text-[10px] px-xs py-0 rounded-sm bg-transparent border-muted-foreground/40 text-muted-foreground font-normal">Ad</Badge>
              <span className="text-metadata text-muted-foreground">·</span>
              <span className="text-metadata text-foreground">{displayUrl}</span>
            </div>
            <div className="mb-xs">
              <a href="#" className="text-primary hover:underline transition-smooth cursor-pointer" onClick={(e) => e.preventDefault()}>
                <h3 className={cn("font-medium leading-tight", previewMode === 'desktop' ? "text-heading-sm" : "text-body")}>
                  {currentCombination.headlines.slice(0, 3).join(' | ') || 'Your Headlines Here'}
                </h3>
              </a>
            </div>
            <div className="mb-sm">
              <p className="text-body-sm text-foreground leading-relaxed">
                {currentCombination.descriptions.join(' ') || 'Your description text will appear here.'}
              </p>
            </div>
            {validSitelinks.length > 0 && (
              <div className={cn("flex flex-wrap gap-xs pt-sm border-t border-border", previewMode === 'mobile' && "flex-col")}>
                {validSitelinks.slice(0, previewMode === 'desktop' ? 4 : 2).map((sitelink, index) => (
                  <a key={index} href="#" className="text-primary text-body-sm hover:underline transition-smooth" onClick={(e) => e.preventDefault()}>
                    {sitelink.description || sitelink.link}
                  </a>
                ))}
              </div>
            )}
            {validCallouts.length > 0 && (
              <div className="flex flex-wrap gap-xs pt-xs text-metadata text-muted-foreground">
                {validCallouts.slice(0, 4).map((callout, index) => (
                  <span key={index}>{callout}{index < validCallouts.length - 1 && index < 3 && ' · '}</span>
                ))}
              </div>
            )}
          </div>
          <div className="mt-md pt-md border-t border-border">
            <div className="grid grid-cols-2 gap-sm">
              <div className="text-center p-sm bg-muted/50 rounded-md">
                <p className="text-heading-sm font-semibold text-foreground">{headlines.filter(h => h?.trim()).length}</p>
                <p className="text-metadata text-muted-foreground">Headlines</p>
              </div>
              <div className="text-center p-sm bg-muted/50 rounded-md">
                <p className="text-heading-sm font-semibold text-foreground">{descriptions.filter(d => d?.trim()).length}</p>
                <p className="text-metadata text-muted-foreground">Descriptions</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}