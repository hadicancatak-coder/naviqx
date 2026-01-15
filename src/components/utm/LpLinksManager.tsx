import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Plus, Pencil, Trash2, Link, ExternalLink } from "lucide-react";
import { useLpLinks, useCreateLpLink, useUpdateLpLink, useDeleteLpLink, LpLink } from "@/hooks/useLpLinks";
import { useSystemEntities } from "@/hooks/useSystemEntities";
import { Skeleton } from "@/components/ui/skeleton";

export function LpLinksManager() {
  const [purposeFilter, setPurposeFilter] = useState<string>("all");
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<LpLink | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    entity_id: "",
    name: "",
    base_url: "",
    purpose: "" as 'AO' | 'Webinar' | 'Seminar' | "",
    lp_type: "static" as 'static' | 'dynamic',
    language: "en",
  });

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

  const resetForm = () => {
    setFormData({
      entity_id: "",
      name: "",
      base_url: "",
      purpose: "",
      lp_type: "static",
      language: "en",
    });
  };

  const handleOpenAddDialog = () => {
    resetForm();
    setEditingLink(null);
    setIsAddDialogOpen(true);
  };

  const handleOpenEditDialog = (link: LpLink) => {
    setFormData({
      entity_id: link.entity_id || "",
      name: link.name || "",
      base_url: link.base_url,
      purpose: (link.purpose || "") as 'AO' | 'Webinar' | 'Seminar' | "",
      lp_type: (link.lp_type || "static") as 'static' | 'dynamic',
      language: link.language || "en",
    });
    setEditingLink(link);
    setIsAddDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.entity_id || !formData.name || !formData.base_url || !formData.purpose) {
      return;
    }

    const payload = {
      entity_id: formData.entity_id,
      name: formData.name,
      base_url: formData.base_url,
      purpose: formData.purpose as 'AO' | 'Webinar' | 'Seminar',
      lp_type: formData.lp_type,
      language: formData.language,
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
                <Label htmlFor="entity">Entity *</Label>
                <Select
                  value={formData.entity_id}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, entity_id: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select entity" />
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

              <div className="grid gap-sm">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Jordan AO Main"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
              </div>

              <div className="grid gap-sm">
                <Label htmlFor="base_url">Base URL *</Label>
                <Input
                  id="base_url"
                  placeholder="https://example.com/lp/jordan"
                  value={formData.base_url}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, base_url: e.target.value }))
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-md">
                <div className="grid gap-sm">
                  <Label htmlFor="purpose">Purpose *</Label>
                  <Select
                    value={formData.purpose}
                    onValueChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        purpose: value as 'AO' | 'Webinar' | 'Seminar',
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select purpose" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AO">📊 AO</SelectItem>
                      <SelectItem value="Webinar">🎥 Webinar</SelectItem>
                      <SelectItem value="Seminar">🎓 Seminar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-sm">
                  <Label htmlFor="lp_type">LP Type *</Label>
                  <Select
                    value={formData.lp_type}
                    onValueChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        lp_type: value as 'static' | 'dynamic',
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="static">📄 Static</SelectItem>
                      <SelectItem value="dynamic">⚡ Dynamic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-sm">
                <Label htmlFor="language">Language</Label>
                <Select
                  value={formData.language}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, language: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">🇬🇧 English</SelectItem>
                    <SelectItem value="ar">🇦🇪 Arabic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
                  !formData.entity_id ||
                  !formData.name ||
                  !formData.base_url ||
                  !formData.purpose ||
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
                <TableHead>Entity</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Base URL</TableHead>
                <TableHead>Purpose</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Language</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLinks?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-lg">
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
                    <TableCell>
                      <div className="flex items-center gap-sm">
                        <span>{getEntityEmoji(link.entity?.code)}</span>
                        <span className="font-medium">
                          {link.entity?.name || "Unknown"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{link.name}</TableCell>
                    <TableCell className="max-w-[200px]">
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
                    <TableCell>
                      <Badge variant="outline">
                        {link.lp_type === "static" ? "📄 Static" : "⚡ Dynamic"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {link.language === "ar" ? "🇦🇪 AR" : "🇬🇧 EN"}
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
