import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Users, RefreshCw } from "lucide-react";
import { findSimilarPairs, generateAlternative, type SimilarPair } from "@/lib/headlineSimilarity";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface HeadlineDiversityCheckerProps {
  headlines: string[];
  onUpdate?: (headlines: string[]) => void;
}

export const HeadlineDiversityChecker = ({
  headlines,
  onUpdate,
}: HeadlineDiversityCheckerProps) => {
  const [threshold, setThreshold] = useState(0.75);

  const validHeadlines = headlines.filter(h => h.trim().length > 0);
  const similarPairs = findSimilarPairs(validHeadlines, threshold);

  const getSimilarityColor = (similarity: number) => {
    if (similarity >= 0.9) return 'text-destructive';
    if (similarity >= 0.75) return 'text-warning';
    return 'text-success';
  };

  const getSimilarityBadgeVariant = (similarity: number): "destructive" | "outline" => {
    if (similarity >= 0.9) return 'destructive';
    return 'outline';
  };

  const handleRewrite = (pair: SimilarPair) => {
    if (!onUpdate) return;

    const newHeadlines = [...headlines];
    const alternative = generateAlternative(pair.headline2);
    newHeadlines[pair.index2] = alternative;
    onUpdate(newHeadlines);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-heading-md flex items-center gap-sm">
            <Users className="h-5 w-5 text-primary" />
            Headline Diversity Check
          </CardTitle>
          <Badge variant={similarPairs.length > 0 ? "destructive" : "outline"}>
            {similarPairs.length} Similar {similarPairs.length === 1 ? 'Pair' : 'Pairs'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-md">
        {/* Threshold Slider */}
        <div className="space-y-sm">
          <div className="flex items-center justify-between">
            <Label>Similarity Threshold</Label>
            <Badge variant="outline">{(threshold * 100).toFixed(0)}%</Badge>
          </div>
          <Slider
            value={[threshold]}
            onValueChange={(values) => setThreshold(values[0])}
            min={0.5}
            max={0.95}
            step={0.05}
            className="w-full"
          />
          <div className="text-metadata text-muted-foreground">
            Lower threshold = more pairs flagged as similar
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-sm p-sm rounded-md bg-muted/50">
          <div className="text-center">
            <div className="text-heading-md font-bold text-foreground">
              {validHeadlines.length}
            </div>
            <div className="text-metadata text-muted-foreground">Total Headlines</div>
          </div>
          <div className="text-center">
            <div className="text-heading-md font-bold text-foreground">
              {new Set(validHeadlines.map(h => h.toLowerCase())).size}
            </div>
            <div className="text-metadata text-muted-foreground">Unique</div>
          </div>
          <div className="text-center">
            <div className={`text-heading-md font-bold ${similarPairs.length > 0 ? 'text-warning' : 'text-success'}`}>
              {similarPairs.length}
            </div>
            <div className="text-metadata text-muted-foreground">Similar Pairs</div>
          </div>
        </div>

        {/* Similar Pairs Table */}
        {similarPairs.length > 0 ? (
          <ScrollArea className="h-[350px] rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40%]">Headline 1</TableHead>
                  <TableHead className="w-[40%]">Headline 2</TableHead>
                  <TableHead className="text-center">Similarity</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {similarPairs.map((pair, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="text-body-sm">
                      <div className="space-y-xs">
                        <div className="text-foreground">{pair.headline1}</div>
                        <Badge variant="outline" className="text-metadata">
                          H{pair.index1 + 1}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-body-sm">
                      <div className="space-y-xs">
                        <div className="text-foreground">{pair.headline2}</div>
                        <Badge variant="outline" className="text-metadata">
                          H{pair.index2 + 1}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={getSimilarityBadgeVariant(pair.similarity)}
                        className={getSimilarityColor(pair.similarity)}
                      >
                        {(pair.similarity * 100).toFixed(0)}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {onUpdate && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRewrite(pair)}
                        >
                          <RefreshCw className="h-3 w-3 mr-xs" />
                          Rewrite
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        ) : (
          <div className="flex items-center justify-center py-lg text-center">
            <div className="space-y-sm">
              <Users className="h-12 w-12 text-success mx-auto" />
              <div className="text-body font-medium text-foreground">
                Great Diversity! 🎉
              </div>
              <div className="text-body-sm text-muted-foreground">
                No similar headline pairs detected above {(threshold * 100).toFixed(0)}% threshold
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
