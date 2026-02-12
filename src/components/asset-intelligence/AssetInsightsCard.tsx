import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Shield, CheckCircle2, AlertCircle } from "lucide-react";
import { useAssetInsights } from "@/hooks/useAssetIntelligence";

export function AssetInsightsCard() {
  const { data: insights, isLoading } = useAssetInsights();

  if (isLoading || !insights) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="bg-card border-border rounded-xl animate-shimmer">
            <CardContent className="p-card h-24" />
          </Card>
        ))}
      </div>
    );
  }

  const entities = Object.entries(insights.byEntity);

  return (
    <div className="space-y-md">
      {/* Entity Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
        {entities.map(([entity, stats]) => {
          const approvalRate = stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0;
          return (
            <Card key={entity} className="bg-card border-border rounded-xl">
              <CardContent className="p-card">
                <div className="flex items-center justify-between mb-sm">
                  <span className="text-heading-sm font-semibold text-foreground">{entity}</span>
                  <Badge variant="outline" className="text-metadata">
                    {stats.total} assets
                  </Badge>
                </div>
                <div className="flex items-center gap-md text-body-sm">
                  <span className="flex items-center gap-xs text-success">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {stats.approved} approved
                  </span>
                  <span className="flex items-center gap-xs text-destructive">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {stats.disapproved} rejected
                  </span>
                </div>
                <div className="mt-sm">
                  <div className="flex items-center justify-between text-metadata text-muted-foreground mb-xs">
                    <span>Approval rate</span>
                    <span className="font-medium">{approvalRate}%</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-success rounded-full transition-smooth"
                      style={{ width: `${approvalRate}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Top Performers */}
      {insights.topPerformers.length > 0 && (
        <Card className="bg-card border-border rounded-xl">
          <CardContent className="p-card">
            <div className="flex items-center gap-xs mb-md">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-body-sm font-semibold text-foreground">Top Performing Assets</span>
            </div>
            <div className="space-y-sm">
              {insights.topPerformers.map((asset, i) => (
                <div key={i} className="flex items-center justify-between gap-md">
                  <div className="flex-1 min-w-0">
                    <p className="text-body-sm text-foreground truncate">{asset.asset_text}</p>
                    <div className="flex items-center gap-xs mt-xs">
                      <Badge variant="secondary" className="text-metadata">{asset.asset_type}</Badge>
                      <span className="text-metadata text-muted-foreground">{asset.entity}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-xs shrink-0">
                    <Shield className="h-3.5 w-3.5 text-primary" />
                    <span className="text-body-sm font-medium text-foreground">
                      {asset.interaction_rate}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
