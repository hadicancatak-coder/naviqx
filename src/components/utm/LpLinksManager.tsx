import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { normalizeLpUrl } from "@/lib/utmHelpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2, Link, ExternalLink, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useLpLinks, useCreateLpLink, useUpdateLpLink, useDeleteLpLink, LpLink } from "@/hooks/useLpLinks";
import { useSystemEntities } from "@/hooks/useSystemEntities";
import { Skeleton } from "@/components/ui/skeleton";

type UrlStatus = "idle" | "checking" | "valid" | "invalid";

export function LpLinksManager() {
  const [purposeFilter, setPurposeFilter] = useState<string>("all");
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<LpLink | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Simplified form state - only Name + URL
  const [formData, setFormData] = useState({
    name: "",
    base_url: "",
  });

  // Auto-detected values
  const [detectedPurpose, setDetectedPurpose] = useState<'AO' | 'Webinar' | 'Seminar'>('AO');
  const [urlStatus, setUrlStatus] = useState<UrlStatus>("idle");

  const { data: entities, isLoading: entitiesLoading } = useSystemEntities();
  const { data: lpLinks, isLoading: linksLoading } = useLpLinks({
    isActive: true,
  });
  const createLpLink = useCreateLpLink();
  const updateLpLink = useUpdateLpLink();
  const deleteLpLink = useDeleteLpLink();

  const filteredLinks = lpLinks?.filter((link) => {
    if (purposeFilter !== "all" && link.purpose !== purposeFilter) return false;
    if (entityFilter !== "all" && link.entity_id !== entityFilter) return false;
    return true;
  });

  // Auto-detect purpose from URL
  const detectPurpose = (url: string): 'AO' | 'Webinar' | 'Seminar' => {
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes('webinar')) return 'Webinar';
    if (lowerUrl.includes('seminar')) return 'Seminar';
    return 'AO';
  };

  // Validate URL by attempting to fetch it
  const validateUrl = async (url: string): Promise<boolean> => {
    try {
      // Try HEAD request with no-cors to check if URL exists
      await fetch(url, { method: 'HEAD', mode: 'no-cors' });
      return true;
    } catch {
      return false;
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      base_url: "",
    });
    setDetectedPurpose('AO');
    setUrlStatus("idle");
  };

  // Handle URL blur - detect purpose, normalize if needed, validate
  const handleUrlBlur = useCallback(async () => {
    const url = formData.base_url.trim();
    if (!url) {
      setUrlStatus("idle");
      return;
    }

    setUrlStatus("checking");

    // Detect purpose from URL
    const purpose = detectPurpose(url);
    setDetectedPurpose(purpose);

    // Normalize URL only for AO (strip language/country for non-webinar/seminar)
    const finalUrl = (purpose === 'Webinar' || purpose === 'Seminar')
      ? url  // Keep as-is for webinar/seminar
      : normalizeLpUrl(url);  // Strip lang/country for AO

    if (finalUrl !== formData.base_url) {
      setFormData(prev => ({ ...prev, base_url: finalUrl }));
    }

    // Validate URL
    const isValid = await validateUrl(finalUrl);
    setUrlStatus(isValid ? "valid" : "invalid");
  }, [formData.base_url]);

  const handleOpenAddDialog = () => {
    resetForm();
    setEditingLink(null);
    setIsAddDialogOpen(true);
  };

  const handleOpenEditDialog = (link: LpLink) => {
    setFormData({
      name: link.name || "",
      base_url: link.base_url,
    });
    setDetectedPurpose((link.purpose || 'AO') as 'AO' | 'Webinar' | 'Seminar');
    setUrlStatus("valid"); // Assume existing links are valid
    setEditingLink(link);
    setIsAddDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.base_url) {
      return;
    }

    // Use auto-detected values
    const payload = {
      entity_id: null as string | null, // No longer required - will be selected in Builder
      name: formData.name,
      base_url: formData.base_url,
      purpose: detectedPurpose,
      lp_type: "static" as const, // Default to static
      language: null as string | null, // No longer tracked here
    };

    if (editingLink) {
      await updateLpLink.mutateAsync({ id: editingLink.id, ...payload });
    } else {
      await createLpLink.mutateAsync(payload);
    }

    setIsAddDialogOpen(false);
    resetForm();
    setEditingLink(null);
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteLpLink.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  const getPurposeBadgeVariant = (purpose: string | null) => {
    switch (purpose) {
      case "AO":
        return "default";
      case "Webinar":
        return "secondary";
      case "Seminar":
        return "outline";
      default:
        return "outline";
    }
  };

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

  const getUrlStatusIcon = () => {
    switch (urlStatus) {
      case "checking":
        return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
      case "valid":
        return <CheckCircle2 className="h-4 w-4 text-success-text" />;
      case "invalid":
        return <XCircle className="h-4 w-4 text-destructive-text" />;
      default:
        return null;
    }
  };

  if (entitiesLoading || linksLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Link className="h-5 w-5" />
          Landing Page Links
        </CardTitle>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenAddDialog} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add LP Link
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingLink ? "Edit LP Link" : "Add New LP Link"}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-md py-md">
              <div className="grid gap-sm">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Gold Campaign, Trading Webinar"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
              </div>

              <div className="grid gap-sm">
                <Label htmlFor="base_url">Link *</Label>
                <div className="relative">
                  <Input
                    id="base_url"
                    placeholder="https://campaigns.example.com/lp/gold-campaign"
                    value={formData.base_url}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, base_url: e.target.value }))
                    }
                    onBlur={handleUrlBlur}
                    className="pr-10"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {getUrlStatusIcon()}
                  </div>
                </div>
                {urlStatus === "invalid" && (
                  <p className="text-metadata text-destructive-text">
                    Could not verify this URL - it may not be accessible
                  </p>
                )}
              </div>

              {/* Auto-detected purpose display */}
              {formData.base_url && urlStatus !== "idle" && (
                <div className="flex items-center gap-sm p-sm rounded-md bg-muted/50">
                  <span className="text-metadata text-muted-foreground">Detected:</span>
                  <Badge variant={getPurposeBadgeVariant(detectedPurpose)}>
                    {detectedPurpose === "AO" && "📊 "}
                    {detectedPurpose === "Webinar" && "🎥 "}
                    {detectedPurpose === "Seminar" && "🎓 "}
                    {detectedPurpose}
                  </Badge>
                  {detectedPurpose === 'AO' && (
                    <span className="text-metadata text-muted-foreground">
                      (URL normalized)
                    </span>
                  )}
                  {(detectedPurpose === 'Webinar' || detectedPurpose === 'Seminar') && (
                    <span className="text-metadata text-muted-foreground">
                      (kept as-is)
                    </span>
                  )}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsAddDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={
                  !formData.name ||
                  !formData.base_url ||
                  createLpLink.isPending ||
                  updateLpLink.isPending
                }
              >
                {editingLink ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-md">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-md">
          <div className="flex items-center gap-sm">
            <Label className="text-muted-foreground">Entity:</Label>
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Entities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entities</SelectItem>
                {entities?.map((entity) => (
                  <SelectItem key={entity.id} value={entity.id}>
                    {getEntityEmoji(entity.code)} {entity.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Tabs value={purposeFilter} onValueChange={setPurposeFilter}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="AO">📊 AO</TabsTrigger>
              <TabsTrigger value="Webinar">🎥 Webinar</TabsTrigger>
              <TabsTrigger value="Seminar">🎓 Seminar</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Table */}
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Base URL</TableHead>
                <TableHead>Purpose</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLinks?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-lg">
                    <div className="flex flex-col items-center gap-sm text-muted-foreground">
                      <Link className="h-8 w-8" />
                      <p>No LP links found</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleOpenAddDialog}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add your first LP Link
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredLinks?.map((link) => (
                  <TableRow key={link.id}>
                    <TableCell className="font-medium">{link.name}</TableCell>
                    <TableCell className="max-w-[300px]">
                      <div className="flex items-center gap-sm">
                        <span className="truncate text-muted-foreground text-body-sm">
                          {link.base_url}
                        </span>
                        <a
                          href={link.base_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getPurposeBadgeVariant(link.purpose)}>
                        {link.purpose === "AO" && "📊 "}
                        {link.purpose === "Webinar" && "🎥 "}
                        {link.purpose === "Seminar" && "🎓 "}
                        {link.purpose}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-xs">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEditDialog(link)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(link.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete LP Link</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this LP link? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
