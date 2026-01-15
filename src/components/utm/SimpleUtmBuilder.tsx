import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Copy, Check, Link, Wand2, ExternalLink, ChevronRight } from "lucide-react";
import { useLpLinks, LpLink } from "@/hooks/useLpLinks";
import { useSystemEntities } from "@/hooks/useSystemEntities";
import { useUtmPlatforms } from "@/hooks/useUtmPlatforms";
import { useUtmCampaigns } from "@/hooks/useUtmCampaigns";
import { useCreateUtmLink } from "@/hooks/useUtmLinks";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { buildUtmUrl, calculateUtmMedium, formatMonthYear2Digit } from "@/lib/utmHelpers";

interface GeneratedLink {
  lpLink: LpLink;
  finalUrl: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmContent: string;
  utmTerm: string;
}

export function SimpleUtmBuilder() {
  // Step states
  const [selectedEntityId, setSelectedEntityId] = useState<string>("");
  const [purposeFilter, setPurposeFilter] = useState<string>("all");
  const [selectedLpIds, setSelectedLpIds] = useState<Set<string>>(new Set());
  
  // UTM config states
  const [platformId, setPlatformId] = useState<string>("");
  const [customPlatform, setCustomPlatform] = useState<string>("");
  const [campaignId, setCampaignId] = useState<string>("");
  const [customCampaign, setCustomCampaign] = useState<string>("");
  const [utmContent, setUtmContent] = useState<string>("");
  const [utmTerm, setUtmTerm] = useState<string>("");
  const [isMobile, setIsMobile] = useState(false);
  
  // Generated links
  const [generatedLinks, setGeneratedLinks] = useState<GeneratedLink[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Data hooks
  const { data: entities, isLoading: entitiesLoading } = useSystemEntities();
  const { data: lpLinks, isLoading: linksLoading } = useLpLinks({
    entityId: selectedEntityId || undefined,
    isActive: true,
  });
  const { data: platforms } = useUtmPlatforms();
  const { data: campaigns } = useUtmCampaigns();
  const createUtmLink = useCreateUtmLink();

  const selectedEntity = entities?.find((e) => e.id === selectedEntityId);

  const filteredLpLinks = useMemo(() => {
    if (!lpLinks) return [];
    if (purposeFilter === "all") return lpLinks;
    return lpLinks.filter((lp) => lp.purpose === purposeFilter);
  }, [lpLinks, purposeFilter]);

  const selectedPlatform = platforms?.find((p) => p.id === platformId);
  const selectedCampaign = campaigns?.find((c) => c.id === campaignId);

  const getEntityEmoji = (code: string | undefined) => {
    const emojiMap: Record<string, string> = {
      JO: "🇯🇴", AE: "🇦🇪", SA: "🇸🇦", KW: "🇰🇼", BH: "🇧🇭",
      OM: "🇴🇲", QA: "🇶🇦", EG: "🇪🇬", LB: "🇱🇧", MU: "🇲🇺",
    };
    return code ? emojiMap[code] || "🌍" : "🌍";
  };

  const handleLpSelect = (lpId: string, checked: boolean) => {
    const newSet = new Set(selectedLpIds);
    if (checked) {
      newSet.add(lpId);
    } else {
      newSet.delete(lpId);
    }
    setSelectedLpIds(newSet);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedLpIds(new Set(filteredLpLinks.map((lp) => lp.id)));
    } else {
      setSelectedLpIds(new Set());
    }
  };

  const handleGenerate = () => {
    if (selectedLpIds.size === 0) {
      toast.error("Please select at least one LP link");
      return;
    }

    const platformName = customPlatform || selectedPlatform?.name || "";
    const campaignName = customCampaign || selectedCampaign?.name || "";

    if (!platformName) {
      toast.error("Please select or enter a platform");
      return;
    }

    if (!campaignName) {
      toast.error("Please select or enter a campaign name");
      return;
    }

    const utmSource = platformName.toLowerCase().replace(/\s+/g, "_");
    const utmMedium = calculateUtmMedium(platformName);
    const utmCampaignValue = `${platformName.toLowerCase()}_${campaignName.toLowerCase().replace(/\s+/g, "_")}_${formatMonthYear2Digit()}`;

    const links: GeneratedLink[] = [];

    filteredLpLinks
      .filter((lp) => selectedLpIds.has(lp.id))
      .forEach((lp) => {
        const finalUrl = buildUtmUrl({
          baseUrl: lp.base_url,
          utmSource,
          utmMedium,
          utmCampaign: utmCampaignValue,
          utmContent: utmContent || undefined,
          utmTerm: isMobile ? (utmTerm || "mobile") : utmTerm || undefined,
          dynamicLanguage: lp.lp_type === "dynamic" ? (lp.language || "en") : undefined,
        });

        links.push({
          lpLink: lp,
          finalUrl,
          utmSource,
          utmMedium,
          utmCampaign: utmCampaignValue,
          utmContent: utmContent || "",
          utmTerm: isMobile ? (utmTerm || "mobile") : utmTerm || "",
        });
      });

    setGeneratedLinks(links);
    toast.success(`Generated ${links.length} UTM link(s)`);
  };

  const handleCopyLink = async (link: GeneratedLink) => {
    await navigator.clipboard.writeText(link.finalUrl);
    setCopiedId(link.lpLink.id);
    toast.success("Link copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyAll = async () => {
    const allUrls = generatedLinks.map((l) => l.finalUrl).join("\n");
    await navigator.clipboard.writeText(allUrls);
    toast.success(`Copied ${generatedLinks.length} links to clipboard`);
  };

  const handleSaveToArchive = async () => {
    if (generatedLinks.length === 0) return;

    try {
      for (const link of generatedLinks) {
        await createUtmLink.mutateAsync({
          name: link.lpLink.name || `${link.utmSource}_${link.utmCampaign}`,
          base_url: link.lpLink.base_url,
          full_url: link.finalUrl,
          utm_source: link.utmSource,
          utm_medium: link.utmMedium,
          utm_campaign: link.utmCampaign,
          utm_content: link.utmContent || null,
          utm_term: link.utmTerm || null,
          entity: link.lpLink.entity?.code ? [link.lpLink.entity.code] : [],
          platform: link.utmSource,
          status: "active",
        });
      }

      toast.success(`Saved ${generatedLinks.length} link(s) to Archive`);
      setGeneratedLinks([]);
      setSelectedLpIds(new Set());
    } catch (error) {
      console.error("Error saving links:", error);
      toast.error("Failed to save links to Archive");
    }
  };

  if (entitiesLoading) {
    return (
      <div className="space-y-md">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-lg">
      {/* Step 1: Entity Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-heading-sm">Step 1: Select Entity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-sm">
            {entities?.map((entity) => (
              <Button
                key={entity.id}
                variant={selectedEntityId === entity.id ? "default" : "outline"}
                onClick={() => {
                  setSelectedEntityId(entity.id);
                  setSelectedLpIds(new Set());
                  setGeneratedLinks([]);
                }}
                className="gap-2"
              >
                <span className="text-lg">{getEntityEmoji(entity.code)}</span>
                {entity.name}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Step 2: LP Links Selection */}
      {selectedEntityId && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-heading-sm flex items-center gap-2">
              <ChevronRight className="h-5 w-5" />
              Step 2: Select Landing Pages
              {selectedEntity && (
                <Badge variant="outline">
                  {getEntityEmoji(selectedEntity.code)} {selectedEntity.name}
                </Badge>
              )}
            </CardTitle>
            <Tabs value={purposeFilter} onValueChange={setPurposeFilter}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="AO">📊 AO</TabsTrigger>
                <TabsTrigger value="Webinar">🎥 Webinar</TabsTrigger>
                <TabsTrigger value="Seminar">🎓 Seminar</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            {linksLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : filteredLpLinks.length === 0 ? (
              <div className="text-center py-lg text-muted-foreground">
                <Link className="h-8 w-8 mx-auto mb-sm" />
                <p>No LP links found for this entity</p>
                <p className="text-body-sm">Add LP links in the Config tab first</p>
              </div>
            ) : (
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={
                            filteredLpLinks.length > 0 &&
                            selectedLpIds.size === filteredLpLinks.length
                          }
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Base URL</TableHead>
                      <TableHead>Purpose</TableHead>
                      <TableHead>Type</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLpLinks.map((lp) => (
                      <TableRow
                        key={lp.id}
                        className={selectedLpIds.has(lp.id) ? "bg-muted/50" : ""}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedLpIds.has(lp.id)}
                            onCheckedChange={(checked) =>
                              handleLpSelect(lp.id, !!checked)
                            }
                          />
                        </TableCell>
                        <TableCell className="font-medium">{lp.name}</TableCell>
                        <TableCell className="max-w-[250px]">
                          <div className="flex items-center gap-sm">
                            <span className="truncate text-muted-foreground text-body-sm">
                              {lp.base_url}
                            </span>
                            <a
                              href={lp.base_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-foreground shrink-0"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {lp.purpose === "AO" && "📊 "}
                            {lp.purpose === "Webinar" && "🎥 "}
                            {lp.purpose === "Seminar" && "🎓 "}
                            {lp.purpose}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {lp.lp_type === "static" ? "📄 Static" : "⚡ Dynamic"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3: UTM Configuration */}
      {selectedLpIds.size > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-heading-sm flex items-center gap-2">
              <ChevronRight className="h-5 w-5" />
              Step 3: Configure UTM Parameters
              <Badge>{selectedLpIds.size} LP(s) selected</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-md">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
              {/* Platform */}
              <div className="space-y-sm">
                <Label>Platform / Source *</Label>
                <Select value={platformId} onValueChange={(v) => {
                  setPlatformId(v);
                  setCustomPlatform("");
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent>
                    {platforms?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Or enter custom platform"
                  value={customPlatform}
                  onChange={(e) => {
                    setCustomPlatform(e.target.value);
                    setPlatformId("");
                  }}
                />
              </div>

              {/* Campaign */}
              <div className="space-y-sm">
                <Label>Campaign *</Label>
                <Select value={campaignId} onValueChange={(v) => {
                  setCampaignId(v);
                  setCustomCampaign("");
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select campaign" />
                  </SelectTrigger>
                  <SelectContent>
                    {campaigns?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Or enter custom campaign"
                  value={customCampaign}
                  onChange={(e) => {
                    setCustomCampaign(e.target.value);
                    setCampaignId("");
                  }}
                />
              </div>

              {/* Content */}
              <div className="space-y-sm">
                <Label>Content (optional)</Label>
                <Input
                  placeholder="e.g., banner_v1"
                  value={utmContent}
                  onChange={(e) => setUtmContent(e.target.value)}
                />
              </div>

              {/* Term */}
              <div className="space-y-sm">
                <Label>Term (optional)</Label>
                <Input
                  placeholder="e.g., keyword"
                  value={utmTerm}
                  onChange={(e) => setUtmTerm(e.target.value)}
                />
              </div>

              {/* Mobile Toggle */}
              <div className="space-y-sm">
                <Label>Device Type</Label>
                <div className="flex items-center gap-sm pt-2">
                  <span className="text-body-sm text-muted-foreground">Desktop</span>
                  <Switch
                    checked={isMobile}
                    onCheckedChange={setIsMobile}
                  />
                  <span className="text-body-sm text-muted-foreground">Mobile</span>
                </div>
              </div>
            </div>

            <Separator />

            <div className="flex justify-end">
              <Button onClick={handleGenerate} className="gap-2">
                <Wand2 className="h-4 w-4" />
                Generate Links
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Generated Links Preview */}
      {generatedLinks.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-heading-sm flex items-center gap-2">
              <Check className="h-5 w-5 text-success-text" />
              Generated Links
              <Badge variant="secondary">{generatedLinks.length}</Badge>
            </CardTitle>
            <div className="flex items-center gap-sm">
              <Button variant="outline" size="sm" onClick={handleCopyAll}>
                <Copy className="h-4 w-4 mr-2" />
                Copy All
              </Button>
              <Button
                size="sm"
                onClick={handleSaveToArchive}
                disabled={createUtmLink.isPending}
              >
                Save to Archive
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>LP Name</TableHead>
                    <TableHead>Purpose</TableHead>
                    <TableHead>Generated URL</TableHead>
                    <TableHead className="w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {generatedLinks.map((link) => (
                    <TableRow key={link.lpLink.id}>
                      <TableCell className="font-medium">
                        {link.lpLink.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{link.lpLink.purpose}</Badge>
                      </TableCell>
                      <TableCell className="max-w-[400px]">
                        <div className="flex items-center gap-sm">
                          <code className="truncate text-body-sm bg-muted px-2 py-1 rounded">
                            {link.finalUrl}
                          </code>
                          <a
                            href={link.finalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-foreground shrink-0"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleCopyLink(link)}
                        >
                          {copiedId === link.lpLink.id ? (
                            <Check className="h-4 w-4 text-success-text" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
