/**
 * Preview Assembly Engine
 * Simulates Google's asset combination for multi-placement previews
 * Generates top 3 probable combinations per placement
 */

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Globe, Smartphone, Image, Monitor, Play, Mail, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CampaignAsset } from "./AssetPicker";

// Placement types per campaign type
const APP_PLACEMENTS = ['search', 'play_store', 'youtube', 'display_network'] as const;
const DISPLAY_PLACEMENTS = ['native', 'in_article', 'gmail', 'banner'] as const;

type AppPlacement = typeof APP_PLACEMENTS[number];
type DisplayPlacement = typeof DISPLAY_PLACEMENTS[number];

const PLACEMENT_CONFIG: Record<string, { label: string; icon: typeof Globe }> = {
  search: { label: 'Search', icon: Globe },
  play_store: { label: 'Play Store', icon: Smartphone },
  youtube: { label: 'YouTube', icon: Play },
  display_network: { label: 'Display Network', icon: Monitor },
  native: { label: 'Native', icon: Monitor },
  in_article: { label: 'In-Article', icon: Globe },
  gmail: { label: 'Gmail', icon: Mail },
  banner: { label: 'Banner', icon: Image },
};

interface PreviewCombination {
  headline: string;
  description: string;
  imageUrl?: string;
  videoUrl?: string;
  logoUrl?: string;
}

interface AssemblyEngineProps {
  adType: 'app' | 'display';
  headlines: string[];
  descriptions: string[];
  longHeadline?: string;
  shortHeadlines?: string[];
  businessName?: string;
  ctaText?: string;
  appPlatform?: string;
  appStoreUrl?: string;
  assets?: CampaignAsset[];
}

function getAssetsByType(assets: CampaignAsset[], type: string): CampaignAsset[] {
  return assets.filter(a => a.asset_type === type && a.status === 'active');
}

function pickRandom<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function generateCombinations(
  headlines: string[],
  descriptions: string[],
  images: CampaignAsset[],
  count: number
): PreviewCombination[] {
  const validH = headlines.filter(h => h?.trim());
  const validD = descriptions.filter(d => d?.trim());
  if (validH.length === 0 && validD.length === 0) return [];

  const combos: PreviewCombination[] = [];
  for (let i = 0; i < count; i++) {
    combos.push({
      headline: validH[i % validH.length] || 'Your Headline',
      description: validD[i % validD.length] || 'Your description here.',
      imageUrl: images[i % images.length]?.asset_url,
    });
  }
  return combos;
}

// APP PLACEMENT RENDERERS
function AppSearchPreview({ combo, businessName, ctaText }: { combo: PreviewCombination; businessName: string; ctaText: string }) {
  return (
    <div className="bg-background border border-border rounded-lg p-md max-w-[360px] mx-auto">
      <div className="flex items-center gap-xs mb-xs">
        <Badge variant="outline" className="text-[10px] px-xs py-0 rounded-sm bg-transparent border-muted-foreground/40 text-muted-foreground">Ad</Badge>
      </div>
      <div className="flex gap-sm">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <span className="text-body font-bold text-primary">{(businessName || 'A')[0]}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-body-sm font-semibold text-foreground truncate">{businessName || 'App Name'}</h3>
          <p className="text-metadata text-primary truncate">{combo.headline}</p>
          <p className="text-metadata text-muted-foreground">★★★★☆ 4.5</p>
        </div>
        <button className="px-sm py-xs bg-primary text-primary-foreground rounded-full text-metadata font-semibold self-center">
          {ctaText || 'Install'}
        </button>
      </div>
    </div>
  );
}

function PlayStorePreview({ combo, businessName, assets }: { combo: PreviewCombination; businessName: string; assets: CampaignAsset[] }) {
  return (
    <div className="bg-background border border-border rounded-lg overflow-hidden max-w-[360px] mx-auto">
      {combo.imageUrl ? (
        <img src={combo.imageUrl} alt="" className="w-full h-[180px] object-cover" />
      ) : (
        <div className="w-full h-[180px] bg-muted/50 flex items-center justify-center">
          <Image className="h-10 w-10 text-muted-foreground/30" />
        </div>
      )}
      <div className="p-md space-y-sm">
        <div className="flex gap-sm">
          <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <span className="text-heading-sm font-bold text-primary">{(businessName || 'A')[0]}</span>
          </div>
          <div>
            <h3 className="text-body font-semibold text-foreground">{businessName || 'App Name'}</h3>
            <p className="text-body-sm text-primary">{combo.headline}</p>
          </div>
        </div>
        <p className="text-body-sm text-muted-foreground line-clamp-2">{combo.description}</p>
      </div>
    </div>
  );
}

function YouTubePreview({ combo, businessName, ctaText, assets }: { combo: PreviewCombination; businessName: string; ctaText: string; assets: CampaignAsset[] }) {
  const videos = getAssetsByType(assets, 'video_landscape');
  return (
    <div className="bg-background border border-border rounded-lg overflow-hidden max-w-[360px] mx-auto">
      <div className="w-full h-[200px] bg-muted flex items-center justify-center relative">
        {videos.length > 0 ? (
          <div className="text-center space-y-xs">
            <Play className="h-10 w-10 text-primary mx-auto" />
            <span className="text-metadata text-muted-foreground">Video Preview</span>
          </div>
        ) : (
          <div className="text-center space-y-xs">
            <Play className="h-10 w-10 text-muted-foreground/30 mx-auto" />
            <span className="text-metadata text-muted-foreground">No video uploaded</span>
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-md">
          <p className="text-body-sm font-semibold text-white">{combo.headline}</p>
        </div>
      </div>
      <div className="p-sm flex items-center justify-between">
        <span className="text-metadata text-muted-foreground">{businessName}</span>
        <button className="px-sm py-xs bg-primary text-primary-foreground rounded-full text-metadata font-semibold">
          {ctaText || 'Install'}
        </button>
      </div>
    </div>
  );
}

// DISPLAY PLACEMENT RENDERERS
function NativePreview({ combo, businessName }: { combo: PreviewCombination; businessName: string }) {
  return (
    <div className="bg-background border border-border rounded-lg overflow-hidden max-w-[360px] mx-auto">
      {combo.imageUrl ? (
        <img src={combo.imageUrl} alt="" className="w-full aspect-square object-cover" />
      ) : (
        <div className="w-full aspect-square bg-muted/50 flex items-center justify-center">
          <Image className="h-10 w-10 text-muted-foreground/30" />
        </div>
      )}
      <div className="p-md space-y-xs">
        <div className="flex items-center gap-xs">
          <Badge variant="outline" className="text-[10px] px-xs py-0">Ad</Badge>
          <span className="text-metadata text-muted-foreground">{businessName}</span>
        </div>
        <h3 className="text-body-sm font-semibold text-foreground">{combo.headline}</h3>
        <p className="text-metadata text-muted-foreground line-clamp-2">{combo.description}</p>
      </div>
    </div>
  );
}

function BannerPreview({ combo, businessName, ctaText }: { combo: PreviewCombination; businessName: string; ctaText: string }) {
  return (
    <div className="bg-background border border-border rounded-lg overflow-hidden max-w-full mx-auto">
      <div className="flex items-stretch h-[90px]">
        {combo.imageUrl ? (
          <img src={combo.imageUrl} alt="" className="w-[160px] object-cover" />
        ) : (
          <div className="w-[160px] bg-muted/50 flex items-center justify-center">
            <Image className="h-6 w-6 text-muted-foreground/30" />
          </div>
        )}
        <div className="flex-1 p-sm flex flex-col justify-center">
          <h3 className="text-body-sm font-semibold text-foreground truncate">{combo.headline}</h3>
          <p className="text-metadata text-muted-foreground truncate">{combo.description}</p>
        </div>
        <div className="flex items-center pr-sm">
          <button className="px-sm py-xs bg-primary text-primary-foreground rounded-md text-metadata font-medium">
            {ctaText || 'Learn More'}
          </button>
        </div>
      </div>
    </div>
  );
}

function GmailPreview({ combo, businessName, logoUrl }: { combo: PreviewCombination; businessName: string; logoUrl?: string }) {
  return (
    <div className="bg-background border border-border rounded-lg p-md max-w-[400px] mx-auto">
      <div className="flex items-start gap-sm">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          {logoUrl ? (
            <img src={logoUrl} alt="" className="w-full h-full rounded-full object-cover" />
          ) : (
            <span className="text-body-sm font-bold text-primary">{(businessName || 'A')[0]}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-xs">
            <span className="text-body-sm font-semibold text-foreground">{businessName || 'Advertiser'}</span>
            <Badge variant="outline" className="text-[10px] px-xs py-0">Ad</Badge>
          </div>
          <h3 className="text-body-sm font-medium text-foreground truncate">{combo.headline}</h3>
          <p className="text-metadata text-muted-foreground truncate">{combo.description}</p>
        </div>
      </div>
    </div>
  );
}

export function PreviewAssemblyEngine({
  adType,
  headlines,
  descriptions,
  longHeadline = '',
  shortHeadlines = [],
  businessName = '',
  ctaText = '',
  appPlatform = '',
  appStoreUrl = '',
  assets = [],
}: AssemblyEngineProps) {
  const placements = adType === 'app' ? APP_PLACEMENTS : DISPLAY_PLACEMENTS;
  const [activePlacement, setActivePlacement] = useState<string>(placements[0]);
  const [comboIndex, setComboIndex] = useState(0);

  // Get image assets
  const squareImages = getAssetsByType(assets, 'image_square');
  const landscapeImages = getAssetsByType(assets, 'image_landscape');
  const logos = [...getAssetsByType(assets, 'logo_square'), ...getAssetsByType(assets, 'logo_wide')];
  const allImages = [...squareImages, ...landscapeImages];

  // Determine available headlines based on type
  const effectiveHeadlines = adType === 'display' 
    ? (shortHeadlines.length > 0 ? shortHeadlines : headlines)
    : headlines;

  // Generate 3 combinations for current placement
  const combinations = useMemo(() => {
    const placementImages = activePlacement === 'native' || activePlacement === 'play_store'
      ? squareImages.length > 0 ? squareImages : landscapeImages
      : landscapeImages.length > 0 ? landscapeImages : squareImages;

    return generateCombinations(effectiveHeadlines, descriptions, placementImages, 3);
  }, [effectiveHeadlines, descriptions, squareImages, landscapeImages, activePlacement]);

  const currentCombo = combinations[comboIndex] || { headline: 'No content', description: 'Add headlines and descriptions' };

  // Check placement availability
  const isPlacementAvailable = (placement: string): boolean => {
    if (adType === 'app') {
      if (placement === 'youtube' && getAssetsByType(assets, 'video_landscape').length === 0 && getAssetsByType(assets, 'video_square').length === 0) return false;
    }
    return effectiveHeadlines.filter(h => h?.trim()).length > 0 || descriptions.filter(d => d?.trim()).length > 0;
  };

  return (
    <div className="p-md">
      <Card className="bg-card border-border shadow-sm rounded-xl overflow-hidden">
        <CardHeader className="p-md pb-sm border-b border-border bg-card">
          <div className="flex items-center justify-between">
            <CardTitle className="text-body-sm font-semibold text-foreground flex items-center gap-xs">
              <Globe className="h-4 w-4 text-primary" />
              Preview Assembly
            </CardTitle>
            <Badge variant="outline" className="text-metadata capitalize">{adType}</Badge>
          </div>

          {/* Placement tabs */}
          <Tabs value={activePlacement} onValueChange={(v) => { setActivePlacement(v); setComboIndex(0); }} className="mt-sm">
            <TabsList className="w-full grid" style={{ gridTemplateColumns: `repeat(${placements.length}, 1fr)` }}>
              {placements.map(p => {
                const config = PLACEMENT_CONFIG[p];
                const available = isPlacementAvailable(p);
                return (
                  <TabsTrigger 
                    key={p} 
                    value={p} 
                    className={cn("text-metadata gap-xs", !available && "opacity-50")}
                    disabled={!available}
                  >
                    {config?.label}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>

          {/* Combination navigator */}
          {combinations.length > 1 && (
            <div className="flex items-center justify-between mt-sm">
              <Badge variant="outline" className="text-metadata">
                Combo {comboIndex + 1}/{combinations.length}
              </Badge>
              <div className="flex items-center gap-xs">
                <Button variant="ghost" size="icon-xs" onClick={() => setComboIndex(prev => prev === 0 ? combinations.length - 1 : prev - 1)}>
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon-xs" onClick={() => setComboIndex(prev => (prev + 1) % combinations.length)}>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardHeader>

        <CardContent className="p-md">
          {combinations.length === 0 ? (
            <div className="text-center py-lg space-y-sm">
              <AlertTriangle className="h-8 w-8 text-warning mx-auto" />
              <p className="text-body-sm text-muted-foreground">
                {!isPlacementAvailable(activePlacement)
                  ? 'This placement requires assets that are not yet uploaded'
                  : 'Add headlines and descriptions to see previews'}
              </p>
            </div>
          ) : (
            <>
              {/* App placements */}
              {adType === 'app' && activePlacement === 'search' && (
                <AppSearchPreview combo={currentCombo} businessName={businessName} ctaText={ctaText} />
              )}
              {adType === 'app' && activePlacement === 'play_store' && (
                <PlayStorePreview combo={currentCombo} businessName={businessName} assets={assets} />
              )}
              {adType === 'app' && activePlacement === 'youtube' && (
                <YouTubePreview combo={currentCombo} businessName={businessName} ctaText={ctaText} assets={assets} />
              )}
              {adType === 'app' && activePlacement === 'display_network' && (
                <NativePreview combo={currentCombo} businessName={businessName} />
              )}

              {/* Display placements */}
              {adType === 'display' && activePlacement === 'native' && (
                <NativePreview combo={currentCombo} businessName={businessName} />
              )}
              {adType === 'display' && activePlacement === 'in_article' && (
                <NativePreview combo={currentCombo} businessName={businessName} />
              )}
              {adType === 'display' && activePlacement === 'gmail' && (
                <GmailPreview combo={currentCombo} businessName={businessName} logoUrl={logos[0]?.asset_url} />
              )}
              {adType === 'display' && activePlacement === 'banner' && (
                <BannerPreview combo={currentCombo} businessName={businessName} ctaText={ctaText} />
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
