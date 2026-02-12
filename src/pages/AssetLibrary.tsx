import { Database } from "lucide-react";
import { AssetTable } from "@/components/asset-intelligence/AssetTable";
import { AssetInsightsCard } from "@/components/asset-intelligence/AssetInsightsCard";
import { AssetImportDialog } from "@/components/asset-intelligence/AssetImportDialog";
import { PageContainer } from "@/components/layout/PageContainer";

export default function AssetLibrary() {
  return (
    <PageContainer size="wide">
      <div className="space-y-lg">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-sm">
            <Database className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-heading-lg font-semibold text-foreground">Asset Intelligence</h1>
              <p className="text-body-sm text-muted-foreground">
                Historical asset performance &amp; policy data from Google Ads
              </p>
            </div>
          </div>
          <AssetImportDialog />
        </div>

        {/* Insights */}
        <AssetInsightsCard />

        {/* Asset Table */}
        <AssetTable />
      </div>
    </PageContainer>
  );
}
