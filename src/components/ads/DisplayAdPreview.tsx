import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Monitor, Smartphone, Globe, Image } from "lucide-react";
import { cn } from "@/lib/utils";

interface DisplayAdPreviewProps {
  longHeadline: string;
  shortHeadlines: string[];
  descriptions: string[];
  ctaText: string;
  landingPage: string;
  businessName: string;
}

export function DisplayAdPreview({
  longHeadline,
  shortHeadlines,
  descriptions,
  ctaText,
  landingPage,
  businessName,
}: DisplayAdPreviewProps) {
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');

  const displayUrl = landingPage
    ? landingPage.replace(/^https?:\/\//, '').split('/')[0]
    : 'example.com';

  const activeShortHeadline = shortHeadlines.find(h => h?.trim()) || 'Your Headline Here';
  const activeDescription = descriptions.find(d => d?.trim()) || 'Your description text will appear here.';
  const activeLongHeadline = longHeadline?.trim() || 'Your Long Headline Here';

  return (
    <div className="p-md">
      <Card className="bg-card border-border shadow-sm rounded-xl overflow-hidden">
        <CardHeader className="p-md pb-sm border-b border-border bg-card">
          <div className="flex items-center justify-between">
            <CardTitle className="text-body-sm font-semibold text-foreground flex items-center gap-xs">
              <Globe className="h-4 w-4 text-primary" />
              Display Ad Preview
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
        </CardHeader>

        <CardContent className="p-md">
          <div className={cn(
            "bg-background border border-border rounded-lg overflow-hidden transition-smooth",
            previewMode === 'mobile' ? "max-w-[320px] mx-auto" : ""
          )}>
            {/* Banner Image Placeholder */}
            <div className={cn(
              "bg-muted/50 flex items-center justify-center border-b border-border",
              previewMode === 'desktop' ? "h-[200px]" : "h-[200px] aspect-square"
            )}>
              <div className="text-center space-y-xs">
                <Image className="h-10 w-10 text-muted-foreground/40 mx-auto" />
                <p className="text-metadata text-muted-foreground">Image Placeholder</p>
              </div>
            </div>

            {/* Ad Content */}
            <div className="p-md space-y-sm">
              {/* Ad badge + URL */}
              <div className="flex items-center gap-xs">
                <Badge variant="outline" className="text-[10px] px-xs py-0 rounded-sm bg-transparent border-muted-foreground/40 text-muted-foreground font-normal">
                  Ad
                </Badge>
                <span className="text-metadata text-muted-foreground">·</span>
                <span className="text-metadata text-foreground">{businessName || displayUrl}</span>
              </div>

              {/* Short Headline */}
              <h3 className={cn(
                "font-semibold text-foreground leading-tight",
                previewMode === 'desktop' ? "text-heading-sm" : "text-body"
              )}>
                {activeShortHeadline}
              </h3>

              {/* Long Headline */}
              <p className="text-body-sm text-primary font-medium leading-snug">
                {activeLongHeadline}
              </p>

              {/* Description */}
              <p className="text-body-sm text-muted-foreground leading-relaxed">
                {activeDescription}
              </p>

              {/* CTA Button */}
              {ctaText && (
                <button className="mt-sm px-md py-xs bg-primary text-primary-foreground rounded-md text-body-sm font-medium hover:bg-primary/90 transition-smooth cursor-default">
                  {ctaText}
                </button>
              )}
            </div>
          </div>

          {/* Preview Stats */}
          <div className="mt-md pt-md border-t border-border">
            <div className="grid grid-cols-3 gap-sm">
              <div className="text-center p-sm bg-muted/50 rounded-md">
                <p className="text-heading-sm font-semibold text-foreground">
                  {shortHeadlines.filter(h => h?.trim()).length}
                </p>
                <p className="text-metadata text-muted-foreground">Short Headlines</p>
              </div>
              <div className="text-center p-sm bg-muted/50 rounded-md">
                <p className="text-heading-sm font-semibold text-foreground">
                  {descriptions.filter(d => d?.trim()).length}
                </p>
                <p className="text-metadata text-muted-foreground">Descriptions</p>
              </div>
              <div className="text-center p-sm bg-muted/50 rounded-md">
                <p className="text-heading-sm font-semibold text-foreground">
                  {longHeadline?.trim() ? '✓' : '—'}
                </p>
                <p className="text-metadata text-muted-foreground">Long Headline</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}