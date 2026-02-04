import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getProductionUrl } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  MoreVertical, 
  Copy, 
  Power, 
  PowerOff, 
  Calendar, 
  Trash2, 
  CheckCircle2,
  Globe,
  MousePointerClick,
  Search,
  Eye,
  BookOpen,
  FolderKanban,
  MapPin,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { Label } from "@/components/ui/label";
import type { ResourceType } from "@/hooks/usePublicAccess";

interface PublicAccessLink {
  id: string;
  access_token: string;
  resource_type: ResourceType;
  resource_id: string | null;
  entity: string | null;
  reviewer_name: string | null;
  reviewer_email: string | null;
  email_verified: boolean;
  expires_at: string | null;
  is_active: boolean;
  is_public: boolean;
  created_by: string | null;
  created_at: string;
  click_count: number;
  last_accessed_at: string | null;
}

type FilterType = 'all' | ResourceType;

export default function ExternalLinksManagement() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [extendLinkId, setExtendLinkId] = useState<string | null>(null);
  const [newExpiration, setNewExpiration] = useState("");
  const [deleteLink, setDeleteLink] = useState<PublicAccessLink | null>(null);

  // Fetch all links from unified table
  const { data: links = [], isLoading } = useQuery({
    queryKey: ["public-access-links"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("public_access_links")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as PublicAccessLink[];
    },
  });

  // Deactivate link
  const deactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("public_access_links")
        .update({ is_active: false })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["public-access-links"] });
      toast.success("Link deactivated");
    },
    onError: () => toast.error("Failed to deactivate link"),
  });

  // Reactivate link
  const reactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("public_access_links")
        .update({ is_active: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["public-access-links"] });
      toast.success("Link reactivated");
    },
    onError: () => toast.error("Failed to reactivate link"),
  });

  // Extend expiration
  const extendMutation = useMutation({
    mutationFn: async ({ id, expiresAt }: { id: string; expiresAt: string }) => {
      const { error } = await supabase
        .from("public_access_links")
        .update({ expires_at: expiresAt })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["public-access-links"] });
      toast.success("Expiration date updated");
      setExtendLinkId(null);
      setNewExpiration("");
    },
    onError: () => toast.error("Failed to update expiration"),
  });

  // Delete link
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("public_access_links")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["public-access-links"] });
      toast.success("Link deleted");
      setDeleteLink(null);
    },
    onError: () => toast.error("Failed to delete link"),
  });

  const copyToClipboard = (link: PublicAccessLink) => {
    const routes: Record<ResourceType, string> = {
      campaign: "/review",
      knowledge: "/knowledge/public",
      project: "/projects/public",
      lp_map: "/lp/public",
      search_ads: "/ads/search/review",
    };
    const url = `${getProductionUrl()}${routes[link.resource_type]}/${link.access_token}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard");
  };

  const getTypeBadge = (type: ResourceType) => {
    const config: Record<ResourceType, { icon: typeof Search; label: string; variant: "default" | "secondary" | "outline" }> = {
      campaign: { icon: Eye, label: "Campaign", variant: "secondary" },
      knowledge: { icon: BookOpen, label: "Knowledge", variant: "outline" },
      project: { icon: FolderKanban, label: "Project", variant: "outline" },
      lp_map: { icon: MapPin, label: "LP Map", variant: "outline" },
      search_ads: { icon: Search, label: "Search Ads", variant: "default" },
    };
    const { icon: Icon, label, variant } = config[type];
    return (
      <Badge variant={variant}>
        <Icon className="h-3 w-3 mr-xs" />
        {label}
      </Badge>
    );
  };

  const getStatusBadge = (link: PublicAccessLink) => {
    if (!link.is_active) {
      return <Badge variant="outline"><PowerOff className="h-3 w-3 mr-xs" />Inactive</Badge>;
    }
    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return <Badge variant="destructive">Expired</Badge>;
    }
    if (link.email_verified) {
      return <Badge variant="default"><CheckCircle2 className="h-3 w-3 mr-xs" />Verified</Badge>;
    }
    return <Badge className="bg-success/15 text-success border-0"><Globe className="h-3 w-3 mr-xs" />Active</Badge>;
  };

  // Filter and search
  const filteredLinks = links.filter((link) => {
    const matchesType = filterType === "all" || link.resource_type === filterType;
    const matchesSearch = 
      !searchQuery ||
      link.entity?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      link.reviewer_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      link.reviewer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      link.resource_type.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  // Calculate stats
  const stats = {
    total: links.length,
    campaign: links.filter((l) => l.resource_type === "campaign").length,
    knowledge: links.filter((l) => l.resource_type === "knowledge").length,
    project: links.filter((l) => l.resource_type === "project").length,
    lp_map: links.filter((l) => l.resource_type === "lp_map").length,
    search_ads: links.filter((l) => l.resource_type === "search_ads").length,
    active: links.filter((l) => l.is_active).length,
    totalClicks: links.reduce((sum, l) => sum + (l.click_count || 0), 0),
  };

  return (
    <div className="space-y-lg">
      <div>
        <h2 className="text-heading-lg">External Access Links</h2>
        <p className="text-body-sm text-muted-foreground">
          Manage all public access links from the unified system
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-md">
        <Card>
          <CardHeader className="pb-sm">
            <CardTitle className="text-body-sm text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-heading-lg font-semibold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-sm">
            <CardTitle className="text-body-sm text-muted-foreground">Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-heading-lg font-semibold">{stats.campaign}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-sm">
            <CardTitle className="text-body-sm text-muted-foreground">Search Ads</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-heading-lg font-semibold text-primary">{stats.search_ads}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-sm">
            <CardTitle className="text-body-sm text-muted-foreground">Knowledge</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-heading-lg font-semibold">{stats.knowledge}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-sm">
            <CardTitle className="text-body-sm text-muted-foreground">Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-heading-lg font-semibold">{stats.project}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-sm">
            <CardTitle className="text-body-sm text-muted-foreground">LP Maps</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-heading-lg font-semibold">{stats.lp_map}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-sm">
            <CardTitle className="text-body-sm text-muted-foreground">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-heading-lg font-semibold text-success">{stats.active}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-sm">
            <CardTitle className="text-body-sm text-muted-foreground flex items-center gap-xs">
              <MousePointerClick className="h-4 w-4" /> Clicks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-heading-lg font-semibold">{stats.totalClicks}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-md">
        <Tabs value={filterType} onValueChange={(v) => setFilterType(v as FilterType)} className="w-full sm:w-auto">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="campaign">Campaigns</TabsTrigger>
            <TabsTrigger value="search_ads">Search Ads</TabsTrigger>
            <TabsTrigger value="knowledge">Knowledge</TabsTrigger>
            <TabsTrigger value="project">Projects</TabsTrigger>
            <TabsTrigger value="lp_map">LP Maps</TabsTrigger>
          </TabsList>
        </Tabs>
        <Input
          placeholder="Search by entity, email, or name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {/* Links Table */}
      <Card>
        <CardContent className="!p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Reviewer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Clicks</TableHead>
                <TableHead>Last Viewed</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-xl">
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                      Loading...
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredLinks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-xl text-muted-foreground">
                    No external links found
                  </TableCell>
                </TableRow>
              ) : (
                filteredLinks.map((link) => (
                  <TableRow key={link.id}>
                    <TableCell>{getTypeBadge(link.resource_type)}</TableCell>
                    <TableCell>
                      <p className="text-body-sm font-medium">{link.entity || "—"}</p>
                    </TableCell>
                    <TableCell>
                      {link.reviewer_name || link.reviewer_email ? (
                        <div className="space-y-xs">
                          <p className="text-body-sm font-medium">
                            {link.reviewer_name || "—"}
                          </p>
                          <p className="text-metadata text-muted-foreground">
                            {link.reviewer_email || "—"}
                          </p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-body-sm">Public</span>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(link)}</TableCell>
                    <TableCell className="text-body-sm">
                      {format(new Date(link.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-body-sm">
                      {link.expires_at
                        ? formatDistanceToNow(new Date(link.expires_at), { addSuffix: true })
                        : "Never"}
                    </TableCell>
                    <TableCell className="text-body-sm font-medium">{link.click_count}</TableCell>
                    <TableCell className="text-body-sm">
                      {link.last_accessed_at
                        ? formatDistanceToNow(new Date(link.last_accessed_at), { addSuffix: true })
                        : "Never"}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => copyToClipboard(link)}>
                            <Copy className="h-4 w-4 mr-sm" />
                            Copy Link
                          </DropdownMenuItem>
                          {link.is_active ? (
                            <DropdownMenuItem onClick={() => deactivateMutation.mutate(link.id)}>
                              <PowerOff className="h-4 w-4 mr-sm" />
                              Deactivate
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => reactivateMutation.mutate(link.id)}>
                              <Power className="h-4 w-4 mr-sm" />
                              Reactivate
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => setExtendLinkId(link.id)}>
                            <Calendar className="h-4 w-4 mr-sm" />
                            Set Expiration
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setDeleteLink(link)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-sm" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Extend Expiration Dialog */}
      <Dialog open={!!extendLinkId} onOpenChange={() => setExtendLinkId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Link Expiration</DialogTitle>
            <DialogDescription>
              Set an expiration date for this access link
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-sm">
            <Label>Expiration Date</Label>
            <Input
              type="datetime-local"
              value={newExpiration}
              onChange={(e) => setNewExpiration(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExtendLinkId(null)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                extendLinkId &&
                extendMutation.mutate({
                  id: extendLinkId,
                  expiresAt: newExpiration,
                })
              }
              disabled={!newExpiration}
            >
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteLink} onOpenChange={() => setDeleteLink(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Access Link</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this access link? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteLink(null)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => deleteLink && deleteMutation.mutate(deleteLink.id)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
