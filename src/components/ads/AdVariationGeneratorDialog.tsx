import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Sparkles, Check, RefreshCw } from "lucide-react";
import { useAdElements } from "@/hooks/useAdElements";
import { generateAdVariations, type AdVariation } from "@/lib/adVariationGenerator";
import { toast } from "sonner";

interface AdVariationGeneratorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entity?: string;
  onSelectVariation: (variation: AdVariation) => void;
}

export function AdVariationGeneratorDialog({
  open,
  onOpenChange,
  entity,
  onSelectVariation,
}: AdVariationGeneratorDialogProps) {
  const [maxVariations, setMaxVariations] = useState(10);
  const [minScore, setMinScore] = useState(60);
  const [isGenerating, setIsGenerating] = useState(false);
  const [variations, setVariations] = useState<AdVariation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Fetch all ad elements from the library
  const { data: allElements = [] } = useAdElements({ entity });

  // Organize elements by type
  const elementsByType = useMemo(() => {
    return {
      headlines: allElements
        .filter(e => e.element_type === 'headline')
        .map(e => e.content)
        .filter(Boolean),
      descriptions: allElements
        .filter(e => e.element_type === 'description')
        .map(e => e.content)
        .filter(Boolean),
      sitelinks: allElements
        .filter(e => e.element_type === 'sitelink')
        .map(e => e.content)
        .filter(Boolean),
      callouts: allElements
        .filter(e => e.element_type === 'callout')
        .map(e => e.content)
        .filter(Boolean),
    };
  }, [allElements]);

  const handleGenerate = () => {
    setIsGenerating(true);
    
    // Small delay to show loading state
    setTimeout(() => {
      try {
        const results = generateAdVariations({
          headlinePool: elementsByType.headlines,
          descriptionPool: elementsByType.descriptions,
          sitelinkPool: elementsByType.sitelinks,
          calloutPool: elementsByType.callouts,
          entity,
          maxVariations,
          minScore,
        });

        setVariations(results);
        
        if (results.length === 0) {
          toast.error("No variations generated. Try lowering the minimum score or adding more elements to your library.");
        } else {
          toast.success(`Generated ${results.length} variations!`);
        }
      } catch (error) {
        console.error("Error generating variations:", error);
        toast.error("Failed to generate variations");
      } finally {
        setIsGenerating(false);
      }
    }, 500);
  };

  const handleSelect = () => {
    const selected = variations.find(v => v.id === selectedId);
    if (selected) {
      onSelectVariation(selected);
      toast.success("Variation applied to ad");
      onOpenChange(false);
    }
  };

  const getStrengthColor = (strength: string) => {
    switch (strength) {
      case 'excellent':
        return 'bg-purple text-purple-foreground';
      case 'good':
        return 'bg-success text-success-foreground';
      case 'average':
        return 'bg-warning text-warning-foreground';
      default:
        return 'bg-destructive text-destructive-foreground';
    }
  };

  const canGenerate = elementsByType.headlines.length >= 3 && elementsByType.descriptions.length >= 2;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple" />
            Ad Variation Generator
          </DialogTitle>
          <DialogDescription>
            Intelligently mix elements from your library to create multiple ad variations
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
          {/* Settings */}
          <div className="grid grid-cols-3 gap-4 p-4 border rounded-lg">
            <div>
              <Label htmlFor="maxVariations">Max Variations</Label>
              <Input
                id="maxVariations"
                type="number"
                min={1}
                max={50}
                value={maxVariations}
                onChange={(e) => setMaxVariations(parseInt(e.target.value) || 10)}
              />
            </div>
            <div>
              <Label htmlFor="minScore">Min Quality Score</Label>
              <Input
                id="minScore"
                type="number"
                min={0}
                max={100}
                value={minScore}
                onChange={(e) => setMinScore(parseInt(e.target.value) || 60)}
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !canGenerate}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Generate Variations
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Library Stats */}
          <div className="flex gap-2 text-sm">
            <Badge variant="outline">
              {elementsByType.headlines.length} Headlines
            </Badge>
            <Badge variant="outline">
              {elementsByType.descriptions.length} Descriptions
            </Badge>
            <Badge variant="outline">
              {elementsByType.sitelinks.length} Sitelinks
            </Badge>
            <Badge variant="outline">
              {elementsByType.callouts.length} Callouts
            </Badge>
          </div>

          {!canGenerate && (
            <div className="p-3 border border-warning/30 bg-warning-soft rounded-lg text-sm">
              You need at least 3 headlines and 2 descriptions in your library to generate variations.
            </div>
          )}

          {/* Variations List */}
          {variations.length > 0 && (
            <ScrollArea className="flex-1 border rounded-lg">
              <div className="p-4 space-y-3">
                {variations.map((variation) => (
                  <Card
                    key={variation.id}
                    className={`cursor-pointer transition-colors ${
                      selectedId === variation.id ? 'border-primary' : ''
                    }`}
                    onClick={() => setSelectedId(variation.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Badge className={getStrengthColor(variation.strength)}>
                            {variation.strength.toUpperCase()}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            Score: {variation.score}/100
                          </span>
                        </div>
                        {selectedId === variation.id && (
                          <Check className="h-5 w-5 text-primary" />
                        )}
                      </div>

                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="font-medium">Headlines ({variation.headlines.length}):</span>
                          <div className="text-muted-foreground mt-1 space-y-0.5">
                            {variation.headlines.slice(0, 3).map((h, i) => (
                              <div key={i}>• {h}</div>
                            ))}
                            {variation.headlines.length > 3 && (
                              <div className="text-metadata">+ {variation.headlines.length - 3} more</div>
                            )}
                          </div>
                        </div>

                        <div>
                          <span className="font-medium">Descriptions ({variation.descriptions.length}):</span>
                          <div className="text-muted-foreground mt-1 space-y-0.5">
                            {variation.descriptions.slice(0, 2).map((d, i) => (
                              <div key={i}>• {d}</div>
                            ))}
                          </div>
                        </div>

                        {variation.sitelinks.length > 0 && (
                          <div className="text-metadata text-muted-foreground">
                            + {variation.sitelinks.length} sitelinks, {variation.callouts.length} callouts
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}

          {variations.length === 0 && !isGenerating && (
            <div className="flex-1 flex items-center justify-center text-center text-muted-foreground">
              <div>
                <Sparkles className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Click "Generate Variations" to create ad combinations</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            {variations.length > 0 && `${variations.length} variations generated`}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSelect} disabled={!selectedId}>
              Apply Selected Variation
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
