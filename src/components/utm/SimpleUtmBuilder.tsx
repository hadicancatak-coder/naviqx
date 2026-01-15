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
import { Copy, Check, Plus, Trash2, Wand2, ExternalLink, Building2 } from "lucide-react";
import { toast } from "sonner";
import { useSystemEntities } from "@/hooks/useSystemEntities";
import { useUtmPlatforms } from "@/hooks/useUtmPlatforms";
import { useUtmCampaigns } from "@/hooks/useUtmCampaigns";
import { useCreateUtmLink } from "@/hooks/useUtmLinks";
import { useLpLinks } from "@/hooks/useLpLinks";
import {
  calculateUtmMedium,
  formatMonthYear2Digit,
  buildUtmUrl,
  generateUtmContent,
} from "@/lib/utmHelpers";
import { cn } from "@/lib/utils";

interface UtmRow {
  id: string;
  lpLinkId: string;
  language: string;
  campaign: string;
  platform: string;
  content: string;
  archivedAt: string | null;
}

const LANGUAGES = ["EN", "AR"];

export function SimpleUtmBuilder() {
  const [selectedEntityId, setSelectedEntityId] = useState<string>("");
  const [rows, setRows] = useState<UtmRow[]>([]);
  const [copiedIds, setCopiedIds] = useState<Set<string>>(new Set());

  // Data hooks
  const { data: entities } = useSystemEntities();
  const { data: platforms } = useUtmPlatforms();
  const { data: campaigns } = useUtmCampaigns();
  const { data: lpLinks } = useLpLinks({ isActive: true });
  const createUtmLink = useCreateUtmLink();

  // All active LP links (no entity filtering - entity is used for URL generation)
  const allLpLinks = lpLinks || [];

  // Get entity info
  const selectedEntity = useMemo(() => {
    return entities?.find(e => e.id === selectedEntityId);
  }, [entities, selectedEntityId]);

  const getEntityEmoji = (code: string | undefined) => {
    const emojiMap: Record<string, string> = {
      JO: "🇯🇴",
      AE: "🇦🇪",
      SA: "🇸🇦",
      KW: "🇰🇼",
      BH: "🇧🇭",
      OM: "🇴🇲",
      QA: "🇶🇦",
      EG: "🇪🇬",
      LB: "🇱🇧",
      MU: "🇲🇺",
    };
    return code ? emojiMap[code] || "🌍" : "🌍";
  };

  // Generate UTM URL for a row
  const generateRowUrl = useCallback(
    (row: UtmRow): string => {
      const lpLink = lpLinks?.find((lp) => lp.id === row.lpLinkId);
      if (!lpLink) return "";

      const platformData = platforms?.find((p) => p.id === row.platform);
      const campaignData = campaigns?.find((c) => c.id === row.campaign);
      const platformName = platformData?.name || "";
      const campaignName = campaignData?.name || "";

      // Get base URL from LP link and build with language
      let lpUrl = lpLink.base_url;
      const entityCode = selectedEntity?.code?.toLowerCase() || lpLink.entity?.code?.toLowerCase() || "";
      
      try {
        const urlObj = new URL(lpUrl);
        const pathParts = urlObj.pathname.split("/").filter(Boolean);
        
        // If dynamic LP, add lang param
        if (lpLink.lp_type === "dynamic") {
          urlObj.searchParams.set("lang", row.language.toLowerCase());
          lpUrl = urlObj.toString();
        } else {
          // For static LP, insert language and entity code at beginning of path
          urlObj.pathname = `/${row.language.toLowerCase()}/${entityCode}/${pathParts.join("/")}`;
          lpUrl = urlObj.toString();
        }
      } catch {
        // Fallback if URL parsing fails
      }

      const utmSource = platformName.toLowerCase();
      const utmMedium = platformData?.utm_medium || calculateUtmMedium(platformName);
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
    [lpLinks, platforms, campaigns, selectedEntity]
  );

  // Add a new row
  const addRow = useCallback(() => {
    const newRow: UtmRow = {
      id: crypto.randomUUID(),
      lpLinkId: allLpLinks[0]?.id || "",
      language: "EN",
      campaign: campaigns?.[0]?.id || "",
      platform: platforms?.[0]?.id || "",
      content: "",
      archivedAt: null,
    };
    setRows((prev) => [...prev, newRow]);
  }, [allLpLinks, campaigns, platforms]);

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
        toast.error("Please select an LP link first");
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
        const lpLink = lpLinks?.find((lp) => lp.id === row.lpLinkId);
        const platformData = platforms?.find((p) => p.id === row.platform);
        const campaignData = campaigns?.find((c) => c.id === row.campaign);
        const platformName = platformData?.name || "";
        const campaignName = campaignData?.name || "";
        const entityName = selectedEntity?.name || lpLink?.entity?.name || "";

        try {
          await createUtmLink.mutateAsync({
            name: `${entityName}_${campaignName}_${row.language}`,
            base_url: lpLink?.base_url || "",
            full_url: url,
            utm_source: platformName.toLowerCase(),
            utm_medium: platformData?.utm_medium || calculateUtmMedium(platformName),
            utm_campaign: `${platformName.toLowerCase()}_${campaignName.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${formatMonthYear2Digit()}`,
            utm_content: row.content || null,
            utm_term: null,
            entity: entityName ? [entityName] : [],
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
    [generateRowUrl, lpLinks, platforms, campaigns, createUtmLink, selectedEntity]
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

  // Handle entity change - clear rows when entity changes
  const handleEntityChange = (entityId: string) => {
    setSelectedEntityId(entityId);
    setRows([]); // Clear rows when entity changes
  };

  return (
    <DataCard>
      <div className="space-y-lg">
        {/* Header with Entity Selector */}
        <div className="flex items-center justify-between gap-lg">
          <div className="flex-1">
            <Label className="text-heading-sm font-semibold">UTM Link Builder</Label>
            <p className="text-metadata text-muted-foreground mt-xs">
              Select an entity to see available landing pages
            </p>
          </div>

          {/* Entity Selector */}
          <div className="flex items-center gap-sm">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedEntityId} onValueChange={handleEntityChange}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select Entity" />
              </SelectTrigger>
              <SelectContent>
                {entities?.map((entity) => (
                  <SelectItem key={entity.id} value={entity.id}>
                    {getEntityEmoji(entity.code)} {entity.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Add Row button - only enabled when entity selected and LPs exist */}
          <Button
            variant="outline"
            size="sm"
            onClick={addRow}
            disabled={!selectedEntityId || allLpLinks.length === 0}
            className="gap-xs"
          >
            <Plus className="h-4 w-4" />
            Add Row
          </Button>
        </div>

        {/* No entity selected state */}
        {!selectedEntityId && (
          <div className="text-center py-2xl text-muted-foreground border border-dashed rounded-lg">
            <Building2 className="h-12 w-12 mx-auto mb-md opacity-50" />
            <p className="text-heading-sm font-medium mb-xs">Select an Entity</p>
            <p className="text-body-sm">
              Choose an entity above to see available landing pages
            </p>
          </div>
        )}

        {/* No LPs in system */}
        {selectedEntityId && allLpLinks.length === 0 && (
          <div className="text-center py-2xl text-muted-foreground border border-dashed rounded-lg">
            <Wand2 className="h-12 w-12 mx-auto mb-md opacity-50" />
            <p className="text-heading-sm font-medium mb-xs">No Landing Pages</p>
            <p className="text-body-sm mb-md">
              No landing pages configured. Add some in the Config tab.
            </p>
          </div>
        )}

        {/* Entity selected with LPs available - show table */}
        {selectedEntityId && allLpLinks.length > 0 && (
          <>
            {/* Available LPs list */}
            <div className="p-md rounded-lg bg-muted/30 border border-border">
              <Label className="text-metadata font-medium text-muted-foreground mb-sm block">
                Building URLs for {getEntityEmoji(selectedEntity?.code)} {selectedEntity?.name} • Available LPs:
              </Label>
              <div className="flex flex-wrap gap-xs">
                {allLpLinks.map((lp) => (
                  <span
                    key={lp.id}
                    className="px-sm py-xs text-metadata bg-card rounded border border-border"
                  >
                    {lp.name || lp.base_url}
                  </span>
                ))}
              </div>
            </div>

            {/* UTM Table */}
            {rows.length === 0 ? (
              <div className="text-center py-xl text-muted-foreground">
                <p className="text-body-sm mb-md">
                  Click "Add Row" to start generating UTM links
                </p>
                <Button variant="outline" onClick={addRow} className="gap-xs">
                  <Plus className="h-4 w-4" />
                  Add Row
                </Button>
              </div>
            ) : (
              <div className="border border-border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-[200px]">Landing Page</TableHead>
                      <TableHead className="w-[100px]">Language</TableHead>
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
                            value={row.lpLinkId}
                            onValueChange={(v) => updateRow(row.id, "lpLinkId", v)}
                          >
                            <SelectTrigger className="h-8 text-metadata">
                              <SelectValue placeholder="Select LP" />
                            </SelectTrigger>
                            <SelectContent>
                              {allLpLinks.map((lp) => (
                                <SelectItem key={lp.id} value={lp.id}>
                                  {lp.name || lp.base_url}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
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
                            value={row.campaign}
                            onValueChange={(v) => updateRow(row.id, "campaign", v)}
                          >
                            <SelectTrigger className="h-8 text-metadata">
                              <SelectValue placeholder="Select" />
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
                              <SelectValue placeholder="Select" />
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
          </>
        )}
      </div>
    </DataCard>
  );
}
