/**
 * Preview Assembly Engine
 * Simulates Google's asset combination for multi-placement previews
 * Generates top 3 probable combinations per placement
 */

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Globe, Smartphone, Image, Monitor, Play, Mail, AlertTriangle, Star, Download, CheckSquare, StarIcon, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import cfiEmblem from "@/assets/cfi-logo-emblem.png";

interface CampaignAsset {
  id: string;
  asset_type: string;
  asset_url: string;
  status?: string | null;
  [key: string]: unknown;
}

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

// Shared image placeholder
function ImagePlaceholder({ className = "", size = "md" }: { className?: string; size?: "sm" | "md" | "lg" }) {
  const iconSize = size === "sm" ? "h-5 w-5" : size === "lg" ? "h-12 w-12" : "h-8 w-8";
  return (
    <div className={cn("bg-gradient-to-br from-muted/30 to-muted/70 border-2 border-dashed border-border rounded-lg flex items-center justify-center", className)}>
      <Image className={cn(iconSize, "text-muted-foreground/25")} />
    </div>
  );
}

// Device frame wrapper for mobile previews
function DeviceFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-[360px] mx-auto">
      <div className="border-2 border-border/60 rounded-[24px] p-[3px] bg-muted/20 shadow-md">
        <div className="rounded-[21px] overflow-hidden bg-background">
          {/* Notch */}
          <div className="h-6 bg-muted/30 flex items-center justify-center">
            <div className="w-16 h-1.5 bg-border/50 rounded-full" />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

// APP PLACEMENT RENDERERS
function AppSearchPreview({ combo, businessName, ctaText }: { combo: PreviewCombination; businessName: string; ctaText: string }) {
  return (
    <DeviceFrame>
      {/* Fake search bar */}
      <div className="px-sm py-xs bg-muted/20">
        <div className="flex items-center gap-xs bg-card border border-border rounded-full px-sm py-xs">
          <Globe className="h-3.5 w-3.5 text-muted-foreground/50" />
          <span className="text-metadata text-muted-foreground/60 flex-1">{businessName || 'Search...'}</span>
        </div>
      </div>
      <div className="p-md">
        <div className="flex items-center gap-xs mb-xs">
          <Badge variant="outline" className="text-[10px] px-xs py-0 rounded-sm bg-transparent border-muted-foreground/40 text-muted-foreground">Ad</Badge>
        </div>
        <div className="flex gap-sm">
          <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 shadow-sm ring-1 ring-border">
            <img src={cfiEmblem} alt="App icon" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-body-sm font-semibold text-foreground truncate">{businessName || 'App Name'}</h3>
            <p className="text-metadata text-primary truncate">{combo.headline}</p>
            <div className="flex items-center gap-[2px] mt-[2px]">
              {[1,2,3,4].map(i => <Star key={i} className="h-2.5 w-2.5 fill-warning text-warning" />)}
              <Star className="h-2.5 w-2.5 text-muted-foreground/30" />
              <span className="text-[10px] text-muted-foreground ml-xs">4.5</span>
            </div>
          </div>
          <button className="px-sm py-xs bg-primary text-primary-foreground rounded-full text-metadata font-semibold self-center shadow-sm">
            {ctaText || 'Install'}
          </button>
        </div>
      </div>
    </DeviceFrame>
  );
}

function PlayStorePreview({ combo, businessName, assets }: { combo: PreviewCombination; businessName: string; assets: CampaignAsset[] }) {
  return (
    <DeviceFrame>
      {combo.imageUrl ? (
        <img src={combo.imageUrl} alt="" className="w-full h-[180px] object-cover" />
      ) : (
        <ImagePlaceholder className="w-full h-[180px] rounded-none border-0" size="lg" />
      )}
      <div className="p-md space-y-sm">
        <div className="flex gap-sm">
          <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 shadow-sm ring-1 ring-border">
            <img src={cfiEmblem} alt="App icon" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-body font-semibold text-foreground">{businessName || 'App Name'}</h3>
            <p className="text-body-sm text-primary">{combo.headline}</p>
          </div>
        </div>
        {/* Realistic Play Store details */}
        <div className="flex items-center gap-md text-metadata text-muted-foreground border-y border-border py-sm">
          <div className="flex items-center gap-[2px]">
            <span className="font-semibold text-foreground">4.5</span>
            <Star className="h-3 w-3 fill-warning text-warning" />
          </div>
          <div className="h-3 w-px bg-border" />
          <div className="flex items-center gap-xs">
            <Download className="h-3 w-3" />
            <span>1M+</span>
          </div>
          <div className="h-3 w-px bg-border" />
          <Badge variant="secondary" className="text-[10px] h-4 px-xs">Finance</Badge>
        </div>
        <p className="text-body-sm text-muted-foreground line-clamp-2">{combo.description}</p>
        <button className="w-full py-xs bg-primary text-primary-foreground rounded-lg text-body-sm font-semibold shadow-sm">
          Install
        </button>
      </div>
    </DeviceFrame>
  );
}

function YouTubePreview({ combo, businessName, ctaText, assets }: { combo: PreviewCombination; businessName: string; ctaText: string; assets: CampaignAsset[] }) {
  return (
    <DeviceFrame>
      <div className="w-full h-[200px] bg-[#0f0f0f] flex items-center justify-center relative">
        {/* YouTube play button overlay */}
        <div className="w-14 h-10 bg-[#ff0000] rounded-xl flex items-center justify-center shadow-lg">
          <Play className="h-5 w-5 text-white fill-white ml-0.5" />
        </div>
        <Badge className="absolute top-sm right-sm bg-black/60 text-white text-[10px] border-0">Ad · 0:15</Badge>
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-md pt-lg">
          <p className="text-body-sm font-semibold text-white">{combo.headline}</p>
        </div>
      </div>
      <div className="p-sm flex items-center gap-sm bg-background">
        <img src={cfiEmblem} alt="" className="w-8 h-8 rounded-full object-cover ring-1 ring-border" />
        <span className="text-metadata text-muted-foreground flex-1">{businessName}</span>
        <button className="px-sm py-xs bg-primary text-primary-foreground rounded-full text-metadata font-semibold shadow-sm">
          {ctaText || 'Install'}
        </button>
      </div>
    </DeviceFrame>
  );
}

// DISPLAY PLACEMENT RENDERERS
function NativePreview({ combo, businessName }: { combo: PreviewCombination; businessName: string }) {
  return (
    <div className="max-w-[360px] mx-auto shadow-md ring-1 ring-border rounded-lg overflow-hidden">
      {combo.imageUrl ? (
        <img src={combo.imageUrl} alt="" className="w-full aspect-[4/3] object-cover" />
      ) : (
        <ImagePlaceholder className="w-full aspect-[4/3] rounded-none border-x-0 border-t-0" size="lg" />
      )}
      <div className="p-md space-y-xs bg-background">
        <div className="flex items-center gap-xs">
          <img src={cfiEmblem} alt="" className="w-4 h-4 rounded-sm object-cover" />
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
    <div className="max-w-full mx-auto">
      <div className="text-[9px] text-muted-foreground/50 text-right mb-[2px] tracking-wide uppercase">Advertisement</div>
      <div className="bg-background shadow-md ring-1 ring-border rounded-lg overflow-hidden">
        <div className="flex items-stretch h-[100px]">
          <div className="w-[100px] flex items-center justify-center bg-muted/20 border-r border-border">
            <img src={cfiEmblem} alt="" className="w-12 h-12 object-contain" />
          </div>
          {combo.imageUrl ? (
            <img src={combo.imageUrl} alt="" className="w-[140px] object-cover" />
          ) : (
            <ImagePlaceholder className="w-[140px] rounded-none border-0" size="sm" />
          )}
          <div className="flex-1 p-sm flex flex-col justify-center min-w-0">
            <h3 className="text-body-sm font-semibold text-foreground truncate">{combo.headline}</h3>
            <p className="text-metadata text-muted-foreground truncate mt-[2px]">{combo.description}</p>
          </div>
          <div className="flex items-center pr-sm">
            <button className="px-sm py-xs bg-primary text-primary-foreground rounded-md text-metadata font-medium shadow-sm">
              {ctaText || 'Learn More'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function GmailPreview({ combo, businessName }: { combo: PreviewCombination; businessName: string }) {
  return (
    <div className="max-w-[440px] mx-auto shadow-md ring-1 ring-border rounded-lg overflow-hidden bg-background">
      {/* Fake inbox context rows */}
      <div className="border-b border-border/50 px-md py-sm flex items-center gap-sm opacity-40">
        <div className="w-4 h-4 border border-border rounded-sm" />
        <div className="w-4 h-4 text-muted-foreground"><StarIcon className="h-4 w-4" /></div>
        <span className="text-metadata font-medium text-foreground flex-1">John from Marketing</span>
        <span className="text-[10px] text-muted-foreground">2:30 PM</span>
      </div>
      {/* Ad row - highlighted */}
      <div className="border-b border-border bg-primary/[0.03] px-md py-sm flex items-start gap-sm">
        <div className="w-4 h-4 border border-border rounded-sm mt-0.5" />
        <div className="w-4 h-4 text-muted-foreground mt-0.5"><StarIcon className="h-4 w-4" /></div>
        <img src={cfiEmblem} alt="" className="w-8 h-8 rounded-full object-cover ring-1 ring-border flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-xs">
            <span className="text-body-sm font-semibold text-foreground">{businessName || 'Advertiser'}</span>
            <Badge variant="outline" className="text-[9px] px-[4px] py-0 h-3.5">Ad</Badge>
          </div>
          <h3 className="text-body-sm font-medium text-foreground truncate">{combo.headline}</h3>
          <p className="text-metadata text-muted-foreground truncate">{combo.description}</p>
        </div>
        <div className="flex items-center gap-xs flex-shrink-0">
          <Clock className="h-3 w-3 text-muted-foreground/50" />
          <span className="text-[10px] text-muted-foreground">Now</span>
        </div>
      </div>
      {/* Another fake row */}
      <div className="px-md py-sm flex items-center gap-sm opacity-40">
        <div className="w-4 h-4 border border-border rounded-sm" />
        <div className="w-4 h-4 text-muted-foreground"><StarIcon className="h-4 w-4" /></div>
        <span className="text-metadata font-medium text-foreground flex-1">Weekly Newsletter</span>
        <span className="text-[10px] text-muted-foreground">1:15 PM</span>
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

  const squareImages = getAssetsByType(assets, 'image_square');
  const landscapeImages = getAssetsByType(assets, 'image_landscape');
  const allImages = [...squareImages, ...landscapeImages];

  const effectiveHeadlines = adType === 'display' 
    ? (shortHeadlines.length > 0 ? shortHeadlines : headlines)
    : headlines;

  const combinations = useMemo(() => {
    const placementImages = activePlacement === 'native' || activePlacement === 'play_store'
      ? squareImages.length > 0 ? squareImages : landscapeImages
      : landscapeImages.length > 0 ? landscapeImages : squareImages;

    return generateCombinations(effectiveHeadlines, descriptions, placementImages, 3);
  }, [effectiveHeadlines, descriptions, squareImages, landscapeImages, activePlacement]);

  const currentCombo = combinations[comboIndex] || { headline: 'No content', description: 'Add headlines and descriptions' };

  const isPlacementAvailable = (placement: string): boolean => {
    return effectiveHeadlines.filter(h => h?.trim()).length > 0 || descriptions.filter(d => d?.trim()).length > 0;
  };

  return (
    <div className="p-md">
      <Card className="bg-card border-border shadow-md ring-1 ring-border rounded-xl overflow-hidden">
        <CardHeader className="p-md pb-sm border-b border-border bg-card">
          <div className="flex items-center justify-between">
            <CardTitle className="text-body-sm font-semibold text-foreground flex items-center gap-xs">
              <Globe className="h-4 w-4 text-primary" />
              Preview Assembly
            </CardTitle>
            <Badge variant="outline" className="text-metadata capitalize">{adType}</Badge>
          </div>

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

        <CardContent className="p-md bg-muted/10">
          {combinations.length === 0 ? (
            <div className="text-center py-lg space-y-sm">
              <AlertTriangle className="h-8 w-8 text-warning mx-auto" />
              <p className="text-body-sm text-muted-foreground">
                Add headlines and descriptions to see previews
              </p>
            </div>
          ) : (
            <>
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

              {adType === 'display' && activePlacement === 'native' && (
                <NativePreview combo={currentCombo} businessName={businessName} />
              )}
              {adType === 'display' && activePlacement === 'in_article' && (
                <NativePreview combo={currentCombo} businessName={businessName} />
              )}
              {adType === 'display' && activePlacement === 'gmail' && (
                <GmailPreview combo={currentCombo} businessName={businessName} />
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
