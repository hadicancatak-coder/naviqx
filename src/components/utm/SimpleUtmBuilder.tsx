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
  const [rows, setRows] = useState<UtmRow[]>([]);
  const [copiedIds, setCopiedIds] = useState<Set<string>>(new Set());

  // Data hooks
  const { data: entities } = useSystemEntities();
  const { data: platforms } = useUtmPlatforms();
  const { data: campaigns } = useUtmCampaigns();
  const { data: lpLinks } = useLpLinks({ isActive: true });
  const createUtmLink = useCreateUtmLink();

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
      try {
        const urlObj = new URL(lpUrl);
        const pathParts = urlObj.pathname.split("/").filter(Boolean);
        
        // If dynamic LP, add lang param
        if (lpLink.lp_type === "dynamic") {
          urlObj.searchParams.set("lang", row.language.toLowerCase());
          lpUrl = urlObj.toString();
        } else {
          // For static LP, insert language and entity code at beginning of path
          const entityCode = lpLink.entity?.code?.toLowerCase() || "";
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
    [lpLinks, platforms, campaigns]
  );

  // Add a new row
  const addRow = useCallback(() => {
    const newRow: UtmRow = {
      id: crypto.randomUUID(),
      lpLinkId: lpLinks?.[0]?.id || "",
      language: "EN",
      campaign: campaigns?.[0]?.id || "",
      platform: platforms?.[0]?.id || "",
      content: "",
      archivedAt: null,
    };
    setRows((prev) => [...prev, newRow]);
  }, [lpLinks, campaigns, platforms]);

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
        const entityName = lpLink?.entity?.name || "";

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
    [generateRowUrl, lpLinks, platforms, campaigns, createUtmLink]
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
  const activeLpLinks = lpLinks || [];

  // Group LP links by entity for easier selection
  const lpLinksByEntity = useMemo(() => {
    const grouped: Record<string, typeof activeLpLinks> = {};
    activeLpLinks.forEach((lp) => {
      const entityName = lp.entity?.name || "Unknown";
      if (!grouped[entityName]) {
        grouped[entityName] = [];
      }
      grouped[entityName].push(lp);
    });
    return grouped;
  }, [activeLpLinks]);

  return (
    <DataCard>
      <div className="space-y-lg">
        {/* Header with Add Row button */}
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-heading-sm font-semibold">UTM Link Builder</Label>
            <p className="text-metadata text-muted-foreground mt-xs">
              Select an LP from config, choose parameters, and generate UTM links
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={addRow} className="gap-xs">
            <Plus className="h-4 w-4" />
            Add Row
          </Button>
        </div>

        {/* UTM Table */}
        {rows.length === 0 ? (
          <div className="text-center py-2xl text-muted-foreground">
            <Wand2 className="h-12 w-12 mx-auto mb-md opacity-50" />
            <p className="text-heading-sm font-medium mb-xs">No UTM Rows Yet</p>
            <p className="text-body-sm mb-md">
              Click "Add Row" to start generating UTM links from your configured LPs
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
                          {Object.entries(lpLinksByEntity).map(([entityName, links]) => (
                            <div key={entityName}>
                              <div className="px-2 py-1.5 text-metadata font-medium text-muted-foreground">
                                {entityName}
                              </div>
                              {links.map((lp) => (
                                <SelectItem key={lp.id} value={lp.id}>
                                  {lp.name || lp.base_url}
                                </SelectItem>
                              ))}
                            </div>
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
      </div>
    </DataCard>
  );
}
