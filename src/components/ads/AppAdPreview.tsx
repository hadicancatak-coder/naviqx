import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Globe, Star, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

interface AppAdPreviewProps {
  headlines: string[];
  descriptions: string[];
  ctaText: string;
  businessName: string;
  appPlatform: string;
  appCampaignGoal: string;
  appStoreUrl: string;
}

export function AppAdPreview({
  headlines,
  descriptions,
  ctaText,
  businessName,
  appPlatform,
  appCampaignGoal,
  appStoreUrl,
}: AppAdPreviewProps) {
  const activeHeadline = headlines.find(h => h?.trim()) || 'Your App Name';
  const activeDescription = descriptions.find(d => d?.trim()) || 'Your app description will appear here.';
  const platformLabel = appPlatform === 'ios' ? 'iOS' : appPlatform === 'android' ? 'Android' : '';
  const goalLabel = appCampaignGoal === 'installs' ? 'Installs' : appCampaignGoal === 'in_app_events' ? 'In-App Events' : appCampaignGoal === 'retargeting' ? 'Retargeting' : '';

  return (
    <div className="p-md">
      <Card className="bg-card border-border shadow-sm rounded-xl overflow-hidden">
        <CardHeader className="p-md pb-sm border-b border-border bg-card">
          <div className="flex items-center justify-between">
            <CardTitle className="text-body-sm font-semibold text-foreground flex items-center gap-xs">
              <Smartphone className="h-4 w-4 text-primary" />
              App Ad Preview
            </CardTitle>
            <div className="flex items-center gap-xs">
              {platformLabel && (
                <Badge variant="outline" className="text-metadata">
                  {platformLabel}
                </Badge>
              )}
              {goalLabel && (
                <Badge variant="secondary" className="text-metadata">
                  {goalLabel}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-md">
          {/* Mobile App Install Card */}
          <div className="bg-background border border-border rounded-lg p-md max-w-[360px] mx-auto">
            {/* Ad Badge */}
            <div className="flex items-center gap-xs mb-sm">
              <Badge variant="outline" className="text-[10px] px-xs py-0 rounded-sm bg-transparent border-muted-foreground/40 text-muted-foreground font-normal">
                Ad
              </Badge>
            </div>

            <div className="flex gap-md">
              {/* App Icon */}
              <div className="flex-shrink-0">
                <div className="w-16 h-16 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <span className="text-heading-md font-bold text-primary">
                    {(businessName || 'A').charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>

              {/* App Info */}
              <div className="flex-1 min-w-0 space-y-xs">
                <h3 className="text-body font-semibold text-foreground truncate">
                  {businessName || 'App Name'}
                </h3>
                <p className="text-body-sm text-primary font-medium truncate">
                  {activeHeadline}
                </p>

                {/* Star Rating */}
                <div className="flex items-center gap-xs">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map(i => (
                      <Star key={i} className={cn("h-3 w-3", i <= 4 ? "text-warning fill-warning" : "text-muted-foreground")} />
                    ))}
                  </div>
                  <span className="text-metadata text-muted-foreground">4.5</span>
                </div>
              </div>

              {/* CTA */}
              <div className="flex-shrink-0 flex items-center">
                <button className="px-md py-xs bg-primary text-primary-foreground rounded-full text-body-sm font-semibold hover:bg-primary/90 transition-smooth cursor-default whitespace-nowrap">
                  {ctaText || 'Install'}
                </button>
              </div>
            </div>

            {/* Description */}
            <p className="mt-sm text-body-sm text-muted-foreground leading-relaxed line-clamp-2">
              {activeDescription}
            </p>

            {/* App Store URL hint */}
            {appStoreUrl && (
              <div className="mt-sm flex items-center gap-xs text-metadata text-muted-foreground">
                <Globe className="h-3 w-3" />
                <span className="truncate">{appStoreUrl.replace(/^https?:\/\//, '').split('/').slice(0, 2).join('/')}</span>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="mt-md pt-md border-t border-border">
            <div className="grid grid-cols-3 gap-sm">
              <div className="text-center p-sm bg-muted/50 rounded-md">
                <p className="text-heading-sm font-semibold text-foreground">
                  {headlines.filter(h => h?.trim()).length}
                </p>
                <p className="text-metadata text-muted-foreground">Headlines</p>
              </div>
              <div className="text-center p-sm bg-muted/50 rounded-md">
                <p className="text-heading-sm font-semibold text-foreground">
                  {descriptions.filter(d => d?.trim()).length}
                </p>
                <p className="text-metadata text-muted-foreground">Descriptions</p>
              </div>
              <div className="text-center p-sm bg-muted/50 rounded-md">
                <p className="text-heading-sm font-semibold text-foreground">
                  {platformLabel || '—'}
                </p>
                <p className="text-metadata text-muted-foreground">Platform</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}