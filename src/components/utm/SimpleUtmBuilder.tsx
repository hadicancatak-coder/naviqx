import { useState, useMemo, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataCard } from "@/components/layout";
import { Copy, Check, Plus, Trash2, Wand2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useSystemEntities } from "@/hooks/useSystemEntities";
import { useUtmPlatforms } from "@/hooks/useUtmPlatforms";
import { useUtmCampaigns } from "@/hooks/useUtmCampaigns";
import { useCreateUtmLink } from "@/hooks/useUtmLinks";
import {
  normalizeLpUrl,
  calculateUtmMedium,
  formatMonthYear2Digit,
  buildUtmUrl,
  generateUtmContent,
} from "@/lib/utmHelpers";
import { cn } from "@/lib/utils";

interface UtmRow {
  id: string;
  language: string;
  country: string;
  campaign: string;
  platform: string;
  content: string;
  archivedAt: string | null;
}

const LANGUAGES = ["EN", "AR"];

export function SimpleUtmBuilder() {
  const [baseLpUrl, setBaseLpUrl] = useState("");
  const [normalizedUrl, setNormalizedUrl] = useState("");
  const [rows, setRows] = useState<UtmRow[]>([]);
  const [copiedIds, setCopiedIds] = useState<Set<string>>(new Set());

  // Data hooks
  const { data: entities } = useSystemEntities();
  const { data: platforms } = useUtmPlatforms();
  const { data: campaigns } = useUtmCampaigns();
  const createUtmLink = useCreateUtmLink();

  // Normalize URL on blur
  const handleUrlBlur = useCallback(() => {
    if (baseLpUrl.trim()) {
      const normalized = normalizeLpUrl(baseLpUrl);
      setNormalizedUrl(normalized);
    }
  }, [baseLpUrl]);

  // Generate UTM URL for a row
  const generateRowUrl = useCallback(
    (row: UtmRow): string => {
      if (!normalizedUrl) return "";

      const platformName = platforms?.find((p) => p.id === row.platform)?.name || "";
      const campaignName = campaigns?.find((c) => c.id === row.campaign)?.name || "";
      const entityCode = entities?.find((e) => e.name === row.country)?.code?.toLowerCase() || "";

      // Build the LP URL with language and country
      let lpUrl = normalizedUrl;
      try {
        const urlObj = new URL(normalizedUrl);
        const pathParts = urlObj.pathname.split("/").filter(Boolean);
        // Insert language and country at the beginning
        urlObj.pathname = `/${row.language.toLowerCase()}/${entityCode}/${pathParts.join("/")}`;
        lpUrl = urlObj.toString();
      } catch {
        // Fallback if URL parsing fails
      }

      const utmSource = platformName.toLowerCase();
      const utmMedium = calculateUtmMedium(platformName);
      const utmCampaign = `${platformName.toLowerCase()}_${campaignName.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${formatMonthYear2Digit()}`;
      const utmContent = row.content || generateUtmContent(lpUrl, campaignName);

      return buildUtmUrl({
        baseUrl: lpUrl,
        utmSource,
        utmMedium,
        utmCampaign,
        utmContent,
      });
    },
    [normalizedUrl, platforms, campaigns, entities]
  );

  // Add a new row
  const addRow = useCallback(() => {
    const newRow: UtmRow = {
      id: crypto.randomUUID(),
      language: "EN",
      country: entities?.[0]?.name || "",
      campaign: campaigns?.[0]?.id || "",
      platform: platforms?.[0]?.id || "",
      content: "",
      archivedAt: null,
    };
    setRows((prev) => [...prev, newRow]);
  }, [entities, campaigns, platforms]);

  // Update a row field
  const updateRow = useCallback((id: string, field: keyof UtmRow, value: string) => {
    setRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  }, []);

  // Delete a row
  const deleteRow = useCallback((id: string) => {
    setRows((prev) => prev.filter((row) => row.id !== id));
  }, []);

  // Copy URL and archive (only once)
  const handleCopy = useCallback(
    async (row: UtmRow) => {
      const url = generateRowUrl(row);
      if (!url) {
        toast.error("Please enter a base LP URL first");
        return;
      }

      await navigator.clipboard.writeText(url);
      setCopiedIds((prev) => new Set(prev).add(row.id));
      setTimeout(() => {
        setCopiedIds((prev) => {
          const next = new Set(prev);
          next.delete(row.id);
          return next;
        });
      }, 2000);

      // Archive only if not already archived
      if (!row.archivedAt) {
        const platformName = platforms?.find((p) => p.id === row.platform)?.name || "";
        const campaignName = campaigns?.find((c) => c.id === row.campaign)?.name || "";

        try {
          await createUtmLink.mutateAsync({
            name: `${row.country}_${campaignName}_${row.language}`,
            base_url: normalizedUrl,
            full_url: url,
            utm_source: platformName.toLowerCase(),
            utm_medium: calculateUtmMedium(platformName),
            utm_campaign: `${platformName.toLowerCase()}_${campaignName.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${formatMonthYear2Digit()}`,
            utm_content: row.content || null,
            utm_term: null,
            entity: [row.country],
            platform: platformName,
            status: "active",
          });

          setRows((prev) =>
            prev.map((r) =>
              r.id === row.id ? { ...r, archivedAt: new Date().toISOString() } : r
            )
          );
          toast.success("Link copied & saved to archive!");
        } catch (error) {
          toast.success("Link copied!");
          console.error("Failed to archive:", error);
        }
      } else {
        toast.success("Link copied!");
      }
    },
    [generateRowUrl, normalizedUrl, platforms, campaigns, createUtmLink]
  );

  // Memoized rows with generated URLs
  const rowsWithUrls = useMemo(() => {
    return rows.map((row) => ({
      ...row,
      generatedUrl: generateRowUrl(row),
    }));
  }, [rows, generateRowUrl]);

  const activePlatforms = platforms?.filter((p) => p.is_active) || [];
  const activeCampaigns = campaigns || [];
  const activeEntities = entities?.filter((e) => e.is_active) || [];

  return (
    <DataCard>
      <div className="space-y-lg">
        {/* Base LP URL Input */}
        <div className="space-y-sm">
          <Label className="text-body-sm font-medium">Base LP URL</Label>
          <div className="flex gap-sm">
            <Input
              placeholder="https://campaigns.cfifinancial.com/ar/jo/shine-with-gold-4"
              value={baseLpUrl}
              onChange={(e) => setBaseLpUrl(e.target.value)}
              onBlur={handleUrlBlur}
              className="flex-1"
            />
            {normalizedUrl && (
              <div className="flex items-center gap-xs text-body-sm text-muted-foreground">
                <span>→</span>
                <code className="px-sm py-xs bg-muted rounded text-metadata truncate max-w-[300px]">
                  {normalizedUrl}
                </code>
              </div>
            )}
          </div>
          <p className="text-metadata text-muted-foreground">
            Language and country path segments will be stripped automatically
          </p>
        </div>

        {/* UTM Table */}
        {normalizedUrl && (
          <div className="space-y-sm">
            <div className="flex items-center justify-between">
              <Label className="text-body-sm font-medium">UTM Variants</Label>
              <Button variant="outline" size="sm" onClick={addRow} className="gap-xs">
                <Plus className="h-4 w-4" />
                Add Row
              </Button>
            </div>

            {rows.length === 0 ? (
              <div className="text-center py-xl text-muted-foreground">
                <Wand2 className="h-10 w-10 mx-auto mb-sm opacity-50" />
                <p className="text-body-sm">Click "Add Row" to create UTM variants</p>
              </div>
            ) : (
              <div className="border border-border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-[100px]">Language</TableHead>
                      <TableHead className="w-[140px]">Country</TableHead>
                      <TableHead className="w-[160px]">Campaign</TableHead>
                      <TableHead className="w-[140px]">Platform</TableHead>
                      <TableHead className="w-[140px]">Content</TableHead>
                      <TableHead>Generated URL</TableHead>
                      <TableHead className="w-[80px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rowsWithUrls.map((row) => (
                      <TableRow
                        key={row.id}
                        className={cn(
                          "transition-smooth",
                          row.archivedAt && "bg-success-soft/30"
                        )}
                      >
                        <TableCell>
                          <Select
                            value={row.language}
                            onValueChange={(v) => updateRow(row.id, "language", v)}
                          >
                            <SelectTrigger className="h-8 text-metadata">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {LANGUAGES.map((lang) => (
                                <SelectItem key={lang} value={lang}>
                                  {lang}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={row.country}
                            onValueChange={(v) => updateRow(row.id, "country", v)}
                          >
                            <SelectTrigger className="h-8 text-metadata">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {activeEntities.map((entity) => (
                                <SelectItem key={entity.id} value={entity.name}>
                                  {entity.emoji} {entity.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={row.campaign}
                            onValueChange={(v) => updateRow(row.id, "campaign", v)}
                          >
                            <SelectTrigger className="h-8 text-metadata">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {activeCampaigns.map((campaign) => (
                                <SelectItem key={campaign.id} value={campaign.id}>
                                  {campaign.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={row.platform}
                            onValueChange={(v) => updateRow(row.id, "platform", v)}
                          >
                            <SelectTrigger className="h-8 text-metadata">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {activePlatforms.map((platform) => (
                                <SelectItem key={platform.id} value={platform.id}>
                                  {platform.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            value={row.content}
                            onChange={(e) => updateRow(row.id, "content", e.target.value)}
                            placeholder="Auto"
                            className="h-8 text-metadata"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-xs">
                            <code className="text-metadata text-muted-foreground truncate max-w-[280px] block">
                              {row.generatedUrl || "—"}
                            </code>
                            {row.generatedUrl && (
                              <a
                                href={row.generatedUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-muted-foreground hover:text-foreground transition-smooth"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-xs">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleCopy(row)}
                              disabled={!row.generatedUrl}
                            >
                              {copiedIds.has(row.id) ? (
                                <Check className="h-4 w-4 text-success-text" />
                              ) : row.archivedAt ? (
                                <div className="relative">
                                  <Copy className="h-4 w-4" />
                                  <Check className="h-2.5 w-2.5 absolute -bottom-0.5 -right-0.5 text-success-text" />
                                </div>
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive-text hover:text-destructive-text"
                              onClick={() => deleteRow(row.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}

        {!normalizedUrl && (
          <div className="text-center py-2xl text-muted-foreground">
            <Wand2 className="h-12 w-12 mx-auto mb-md opacity-50" />
            <p className="text-heading-sm font-medium mb-xs">Enter a Landing Page URL</p>
            <p className="text-body-sm">
              Paste any LP URL above to start generating UTM variants
            </p>
          </div>
        )}
      </div>
    </DataCard>
  );
}
