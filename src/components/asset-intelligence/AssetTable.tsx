import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, CheckCircle2, AlertCircle, AlertTriangle, Search } from "lucide-react";
import { useAssetIntelligence } from "@/hooks/useAssetIntelligence";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AssetTableProps {
  initialEntity?: string;
}

const ASSET_TYPES = ["all", "Headline", "Description", "Callout", "Sitelink", "Structured Snippet"];
const POLICY_STATUSES = ["all", "approved", "disapproved", "mixed"];
const LANGUAGES = ["all", "EN", "AR"];

export function AssetTable({ initialEntity }: AssetTableProps) {
  const [entity, setEntity] = useState(initialEntity || "all");
  const [assetType, setAssetType] = useState("all");
  const [policyStatus, setPolicyStatus] = useState("all");
  const [language, setLanguage] = useState("all");
  const [search, setSearch] = useState("");
  const { copy } = useCopyToClipboard();

  const { data: assets, isLoading } = useAssetIntelligence({
    entity,
    assetType,
    policyStatus,
    language,
    search: search.length >= 2 ? search : undefined,
  });

  const PolicyIcon = ({ status }: { status: string }) => {
    if (status === "approved") return <CheckCircle2 className="h-3.5 w-3.5 text-success" />;
    if (status === "disapproved") return <AlertCircle className="h-3.5 w-3.5 text-destructive" />;
    return <AlertTriangle className="h-3.5 w-3.5 text-warning" />;
  };

  return (
    <div className="space-y-md">
      {/* Filter Bar */}
      <Card className="bg-card border-border rounded-xl">
        <CardContent className="p-md">
          <div className="flex flex-wrap gap-sm items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search assets..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-elevated border-input"
              />
            </div>
            <Select value={entity} onValueChange={setEntity}>
              <SelectTrigger className="w-[140px] bg-elevated border-input">
                <SelectValue placeholder="Entity" />
              </SelectTrigger>
              <SelectContent className="liquid-glass-dropdown">
                <SelectItem value="all">All Countries</SelectItem>
                <SelectItem value="Lebanon">Lebanon</SelectItem>
                <SelectItem value="Jordan">Jordan</SelectItem>
                <SelectItem value="Kuwait">Kuwait</SelectItem>
              </SelectContent>
            </Select>
            <Select value={assetType} onValueChange={setAssetType}>
              <SelectTrigger className="w-[140px] bg-elevated border-input">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent className="liquid-glass-dropdown">
                {ASSET_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t === "all" ? "All Types" : t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={policyStatus} onValueChange={setPolicyStatus}>
              <SelectTrigger className="w-[140px] bg-elevated border-input">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="liquid-glass-dropdown">
                {POLICY_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s === "all" ? "All Statuses" : s.charAt(0).toUpperCase() + s.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="w-[100px] bg-elevated border-input">
                <SelectValue placeholder="Lang" />
              </SelectTrigger>
              <SelectContent className="liquid-glass-dropdown">
                {LANGUAGES.map((l) => (
                  <SelectItem key={l} value={l}>
                    {l === "all" ? "All" : l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Asset List */}
      <Card className="bg-card border-border rounded-xl overflow-hidden">
        <ScrollArea className="max-h-[600px]">
          {isLoading ? (
            <div className="p-lg text-center text-muted-foreground text-body-sm">Loading assets...</div>
          ) : !assets?.length ? (
            <div className="p-lg text-center text-muted-foreground text-body-sm">
              No assets found. Import a CSV to get started.
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-elevated sticky top-0 z-10">
                <tr className="border-b border-border">
                  <th className="text-left p-sm text-metadata font-medium text-muted-foreground">Asset</th>
                  <th className="text-left p-sm text-metadata font-medium text-muted-foreground w-[100px]">Type</th>
                  <th className="text-left p-sm text-metadata font-medium text-muted-foreground w-[100px]">Entity</th>
                  <th className="text-center p-sm text-metadata font-medium text-muted-foreground w-[80px]">Policy</th>
                  <th className="text-right p-sm text-metadata font-medium text-muted-foreground w-[80px]">Int. Rate</th>
                  <th className="text-right p-sm text-metadata font-medium text-muted-foreground w-[80px]">Conv.</th>
                  <th className="text-right p-sm text-metadata font-medium text-muted-foreground w-[50px]">Lang</th>
                  <th className="p-sm w-[40px]"></th>
                </tr>
              </thead>
              <tbody>
                {assets.map((asset) => (
                  <tr
                    key={asset.id}
                    className="border-b border-subtle hover:bg-card-hover transition-smooth"
                  >
                    <td className="p-sm">
                      <p className={cn(
                        "text-body-sm text-foreground line-clamp-2",
                        asset.language === "AR" && "text-right dir-rtl"
                      )}>
                        {asset.asset_text}
                      </p>
                    </td>
                    <td className="p-sm">
                      <Badge variant="secondary" className="text-metadata">{asset.asset_type}</Badge>
                    </td>
                    <td className="p-sm text-body-sm text-muted-foreground">{asset.entity}</td>
                    <td className="p-sm text-center">
                      <PolicyIcon status={asset.policy_status} />
                    </td>
                    <td className="p-sm text-right text-body-sm font-medium text-foreground">
                      {asset.interaction_rate > 0 ? `${asset.interaction_rate}%` : "—"}
                    </td>
                    <td className="p-sm text-right text-body-sm text-muted-foreground">
                      {asset.total_conversions > 0 ? asset.total_conversions.toFixed(1) : "—"}
                    </td>
                    <td className="p-sm text-right text-metadata text-muted-foreground">
                      {asset.language}
                    </td>
                    <td className="p-sm">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => copy(asset.asset_text, "Asset copied!")}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </ScrollArea>
      </Card>

      {assets && assets.length > 0 && (
        <p className="text-metadata text-muted-foreground text-right">
          Showing {assets.length} assets
        </p>
      )}
    </div>
  );
}
