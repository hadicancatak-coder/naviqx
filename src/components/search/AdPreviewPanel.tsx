import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ChevronLeft, ChevronRight, Lightbulb, AlertTriangle, Sparkles, X } from 'lucide-react';
import { SearchAdPreview } from '@/components/ads/SearchAdPreview';
import { calculateAdStrength } from '@/lib/adQualityScore';

interface AdPreviewPanelProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ad: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  campaign: any;
  entity: string;
  headlines: string[];
  descriptions: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sitelinks: any[];
  callouts: string[];
  landingPage: string;
  businessName: string;
  language: string;
  adType: "search" | "display";
  longHeadline?: string;
  shortHeadlines?: string[];
  ctaText?: string;
}

export function AdPreviewPanel(props: AdPreviewPanelProps) {
  const [combinationIndex, setCombinationIndex] = useState(0);
  
  // Calculate ad strength
  const adStrength = useMemo(() => {
    const validHeadlines = props.headlines.filter(h => h.trim());
    const validDescriptions = props.descriptions.filter(d => d.trim());
    const validSitelinks = props.sitelinks.filter(s => s.description?.trim()).map(s => s.description);
    const validCallouts = props.callouts.filter(c => c.trim());
    
    return calculateAdStrength(
      validHeadlines,
      validDescriptions,
      validSitelinks,
      validCallouts
    );
  }, [props.headlines, props.descriptions, props.sitelinks, props.callouts]);
  
  // Generate preview combinations for search ads
  const combinations = useMemo(() => {
    if (props.adType !== "search") return [];
    
    const validHeadlines = props.headlines.filter(h => h.trim());
    const validDescriptions = props.descriptions.filter(d => d.trim());
    
    if (validHeadlines.length === 0 || validDescriptions.length === 0) {
      return [];
    }
    
    const combos = [];
    // Generate up to 10 combinations
    for (let i = 0; i < Math.min(10, validHeadlines.length); i++) {
      combos.push({
        headlines: validHeadlines.slice(i, i + 3).concat(validHeadlines.slice(0, Math.max(0, 3 - (validHeadlines.length - i)))).slice(0, 3),
        descriptions: validDescriptions.slice(i % validDescriptions.length, (i % validDescriptions.length) + 2).concat(validDescriptions.slice(0, Math.max(0, 2 - (validDescriptions.length - (i % validDescriptions.length))))).slice(0, 2)
      });
    }
    return combos;
  }, [props.headlines, props.descriptions, props.adType]);
  
  const getStrengthColor = (strength: string) => {
    switch (strength) {
      case 'excellent': return 'text-success';
      case 'good': return 'text-primary';
      case 'average': return 'text-warning';
      default: return 'text-destructive';
    }
  };
  
  const getStrengthBadge = (strength: string) => {
    switch (strength) {
      case 'excellent': return 'default';
      case 'good': return 'secondary';
      case 'average': return 'outline';
      default: return 'destructive';
    }
  };
  
  return (
    <div className="h-full overflow-auto bg-muted/30">
      <div className="sticky top-0 z-10 bg-background border-b p-md">
        <h3 className="text-heading-sm font-semibold">Live Preview</h3>
        <p className="text-metadata text-muted-foreground">See how your ad will appear</p>
      </div>
      
      <div className="p-md space-y-md">
        {/* Ad Strength Score */}
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="pb-sm">
            <CardTitle className="text-body flex items-center gap-xs">
              <Sparkles className="h-4 w-4 text-primary" />
              Ad Strength
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-sm">
            <div className="flex items-center gap-sm">
              <Progress value={adStrength.score} className="flex-1 h-2" />
              <Badge variant={getStrengthBadge(adStrength.strength)} className="font-semibold">
                {adStrength.strength.toUpperCase()}
              </Badge>
            </div>
            <p className="text-metadata text-muted-foreground">
              {adStrength.score}/100 points
            </p>
          </CardContent>
        </Card>
        
        {/* Preview Navigation for Search Ads */}
        {props.adType === "search" && combinations.length > 1 && (
          <div className="flex justify-between items-center p-sm bg-muted/50 rounded-md">
            <Button 
              size="sm" 
              variant="ghost"
              onClick={() => setCombinationIndex(i => Math.max(0, i - 1))}
              disabled={combinationIndex === 0}
              className="h-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-body-sm font-medium">
              Preview {combinationIndex + 1} of {combinations.length}
            </span>
            <Button 
              size="sm" 
              variant="ghost"
              onClick={() => setCombinationIndex(i => Math.min(combinations.length - 1, i + 1))}
              disabled={combinationIndex >= combinations.length - 1}
              className="h-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
        
        {/* Preview */}
        <Card className="bg-gradient-to-br from-background to-muted/20">
          <CardContent className="p-md">
            {combinations.length > 0 ? (
              <SearchAdPreview
                headlines={combinations[combinationIndex]?.headlines || []}
                descriptions={combinations[combinationIndex]?.descriptions || []}
                landingPage={props.landingPage || 'https://example.com'}
                businessName={props.businessName}
                sitelinks={props.sitelinks.filter(s => s.description)}
                callouts={props.callouts.filter(c => c.trim())}
              />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-body-sm">Add headlines and descriptions to see preview</p>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Suggestions */}
        {adStrength.suggestions.length > 0 && (
          <Card className="border-l-4 border-l-warning bg-warning/5">
            <CardContent className="p-md">
              <p className="text-body-sm font-semibold mb-sm flex items-center gap-xs">
                <Lightbulb className="h-4 w-4 text-warning" />
                Improvement Tips
              </p>
              <ul className="space-y-xs text-body-sm text-foreground">
                {adStrength.suggestions.slice(0, 3).map((suggestion, idx) => (
                  <li key={idx} className="flex items-start gap-xs">
                    <span className="text-warning mt-0.5">•</span>
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Best Practice Hints */}
        <div className="space-y-sm">
          {props.headlines.filter(h => h.trim()).length < 8 && (
            <div className="flex items-start gap-sm p-sm bg-primary/10 border border-primary/30 rounded-md hover:bg-primary/15 transition-smooth">
              <Lightbulb className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-body-sm font-medium text-foreground mb-0.5">Add More Headlines</p>
                <p className="text-metadata text-muted-foreground">
                  {8 - props.headlines.filter(h => h.trim()).length} more needed for "Excellent" rating
                </p>
              </div>
            </div>
          )}
          
          {props.descriptions.some(d => d.trim() && d.length < 60) && (
            <div className="flex items-start gap-sm p-sm bg-warning/10 border border-warning/30 rounded-md hover:bg-warning/15 transition-smooth">
              <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-body-sm font-medium text-foreground mb-0.5">Expand Descriptions</p>
                <p className="text-metadata text-muted-foreground">
                  Use all 90 characters for better performance
                </p>
              </div>
            </div>
          )}
          
          {props.sitelinks.filter(s => s.description?.trim()).length === 0 && (
            <div className="flex items-start gap-sm p-sm bg-muted/70 border border-border rounded-md hover:bg-muted transition-smooth">
              <Sparkles className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-body-sm font-medium text-foreground mb-0.5">Add Sitelinks</p>
                <p className="text-metadata text-muted-foreground">
                  Increase ad space and click-through rate
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
