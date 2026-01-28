import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getProductionUrl } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  XCircle,
  AlertCircle,
  BookOpen,
  Globe,
  Eye,
  MousePointerClick,
  FolderKanban
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { Label } from "@/components/ui/label";

interface UnifiedLink {
  id: string;
  type: 'campaign' | 'knowledge' | 'project';
  title: string;
  entity?: string;
  reviewer_name?: string;
  reviewer_email?: string;
  is_active: boolean;
  is_verified?: boolean;
  created_at: string;
  expires_at?: string;
  click_count: number;
  last_accessed_at?: string;
  access_token?: string;
  public_token?: string;
}

export default function ExternalLinksManagement() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [extendLinkId, setExtendLinkId] = useState<string | null>(null);
  const [newExpiration, setNewExpiration] = useState("");
  const [deleteLink, setDeleteLink] = useState<{ id: string; type: 'campaign' | 'knowledge' | 'project' } | null>(null);

  // Fetch all external access links
  const { data: campaignLinks = [] } = useQuery({
    queryKey: ["external-access-links"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaign_external_access")
        .select(`
          *,
          utm_campaigns (
            name
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch public knowledge pages
  const { data: knowledgePages = [] } = useQuery({
    queryKey: ["public-knowledge-pages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("knowledge_pages")
        .select("*")
        .eq("is_public", true)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch public projects
  const { data: publicProjects = [] } = useQuery({
    queryKey: ["public-projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("is_public", true)
        .not("public_token", "is", null)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData,
  });

  // Unify all links into single list
  const unifiedLinks: UnifiedLink[] = [
    ...campaignLinks.map((link): UnifiedLink => ({
      id: link.id,
      type: 'campaign',
      title: link.utm_campaigns?.name || 'All Campaigns',
      entity: link.entity,
      reviewer_name: link.reviewer_name,
      reviewer_email: link.reviewer_email,
      is_active: link.is_active,
      is_verified: link.email_verified,
      created_at: link.created_at,
      expires_at: link.expires_at,
      click_count: link.click_count || 0,
      last_accessed_at: link.last_accessed_at,
      access_token: link.access_token,
    })),
    ...knowledgePages.map((page): UnifiedLink => ({
      id: page.id,
      type: 'knowledge',
      title: page.title,
      reviewer_name: page.reviewer_name,
      reviewer_email: page.reviewer_email,
      is_active: page.is_public,
      created_at: page.created_at,
      click_count: page.click_count || 0,
      last_accessed_at: page.last_accessed_at,
      public_token: page.public_token,
    })),
    ...publicProjects.map((project): UnifiedLink => ({
      id: project.id,
      type: 'project',
      title: project.name,
      is_active: project.is_public,
      created_at: project.created_at,
      click_count: project.click_count || 0,
      last_accessed_at: project.last_accessed_at,
      public_token: project.public_token,
    })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Deactivate campaign link
  const deactivateCampaignMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("campaign_external_access")
        .update({ is_active: false })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["external-access-links"] });
      toast.success("Link deactivated");
    },
    onError: () => toast.error("Failed to deactivate link"),
  });

  // Reactivate campaign link
  const reactivateCampaignMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("campaign_external_access")
        .update({ is_active: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["external-access-links"] });
      toast.success("Link reactivated");
    },
    onError: () => toast.error("Failed to reactivate link"),
  });

  // Toggle knowledge page public status
  const toggleKnowledgePublicMutation = useMutation({
    mutationFn: async ({ id, isPublic }: { id: string; isPublic: boolean }) => {
      const { error } = await supabase
        .from("knowledge_pages")
        .update({ is_public: isPublic })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["public-knowledge-pages"] });
      toast.success("Knowledge page visibility updated");
    },
    onError: () => toast.error("Failed to update knowledge page"),
  });

  // Extend expiration (campaign only)
  const extendMutation = useMutation({
    mutationFn: async ({ id, expiresAt }: { id: string; expiresAt: string }) => {
      const { error } = await supabase
        .from("campaign_external_access")
        .update({ expires_at: expiresAt })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["external-access-links"] });
      toast.success("Expiration date updated");
      setExtendLinkId(null);
      setNewExpiration("");
    },
    onError: () => toast.error("Failed to update expiration"),
  });

  // Delete campaign link
  const deleteCampaignMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("campaign_external_access")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["external-access-links"] });
      toast.success("Link deleted");
      setDeleteLink(null);
    },
    onError: () => toast.error("Failed to delete link"),
  });

  // Delete knowledge page public access (make private + clear tracking)
  const deleteKnowledgeLinkMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("knowledge_pages")
        .update({ 
          is_public: false, 
          public_token: null,
          click_count: 0,
          last_accessed_at: null,
          reviewer_name: null,
          reviewer_email: null
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["public-knowledge-pages"] });
      toast.success("Public access removed");
      setDeleteLink(null);
    },
    onError: () => toast.error("Failed to remove public access"),
  });

  // Toggle project public status
  const toggleProjectPublicMutation = useMutation({
    mutationFn: async ({ id, isPublic }: { id: string; isPublic: boolean }) => {
      const { error } = await supabase
        .from("projects")
        .update({ is_public: isPublic })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["public-projects"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Project visibility updated");
    },
    onError: () => toast.error("Failed to update project"),
  });

  // Delete project public access (make private + clear token)
  const deleteProjectLinkMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("projects")
        .update({ 
          is_public: false, 
          public_token: null,
          click_count: 0,
          last_accessed_at: null
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["public-projects"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Public access removed");
      setDeleteLink(null);
    },
    onError: () => toast.error("Failed to remove public access"),
  });

  const copyToClipboard = (link: UnifiedLink) => {
    let url: string;
    if (link.type === 'campaign') {
      url = `${getProductionUrl()}/campaigns-log/review/${link.access_token}`;
    } else if (link.type === 'knowledge') {
      url = `${getProductionUrl()}/knowledge/public/${link.public_token}`;
    } else {
      url = `${getProductionUrl()}/projects/public/${link.public_token}`;
    }
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard");
  };

  const handleDeactivate = (link: UnifiedLink) => {
    if (link.type === 'campaign') {
      deactivateCampaignMutation.mutate(link.id);
    } else if (link.type === 'knowledge') {
      toggleKnowledgePublicMutation.mutate({ id: link.id, isPublic: false });
    } else {
      toggleProjectPublicMutation.mutate({ id: link.id, isPublic: false });
    }
  };

  const handleReactivate = (link: UnifiedLink) => {
    if (link.type === 'campaign') {
      reactivateCampaignMutation.mutate(link.id);
    } else if (link.type === 'knowledge') {
      toggleKnowledgePublicMutation.mutate({ id: link.id, isPublic: true });
    } else {
      toggleProjectPublicMutation.mutate({ id: link.id, isPublic: true });
    }
  };

  const handleDelete = () => {
    if (!deleteLink) return;
    if (deleteLink.type === 'campaign') {
      deleteCampaignMutation.mutate(deleteLink.id);
    } else if (deleteLink.type === 'knowledge') {
      deleteKnowledgeLinkMutation.mutate(deleteLink.id);
    } else {
      deleteProjectLinkMutation.mutate(deleteLink.id);
    }
  };

  const getStatusBadge = (link: UnifiedLink) => {
    if (!link.is_active) {
      return <Badge variant="outline"><PowerOff className="h-3 w-3 mr-1" />Inactive</Badge>;
    }
    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Expired</Badge>;
    }
    if (link.is_verified) {
      return <Badge variant="default"><CheckCircle2 className="h-3 w-3 mr-1" />Verified</Badge>;
    }
    return <Badge className="bg-success/15 text-success border-0"><Globe className="h-3 w-3 mr-1" />Active</Badge>;
  };

  const getTypeBadge = (link: UnifiedLink) => {
    if (link.type === 'campaign') {
      return <Badge variant="secondary"><Eye className="h-3 w-3 mr-1" />Campaign</Badge>;
    }
    if (link.type === 'knowledge') {
      return <Badge variant="outline"><BookOpen className="h-3 w-3 mr-1" />Knowledge</Badge>;
    }
    return <Badge variant="outline"><FolderKanban className="h-3 w-3 mr-1" />Project</Badge>;
  };

  const filteredLinks = unifiedLinks.filter((link) =>
    link.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    link.entity?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    link.reviewer_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    link.reviewer_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate stats
  const stats = {
    total: unifiedLinks.length,
    campaigns: campaignLinks.length,
    knowledge: knowledgePages.length,
    projects: publicProjects.length,
    active: unifiedLinks.filter((l) => l.is_active).length,
    totalClicks: unifiedLinks.reduce((sum, l) => sum + (l.click_count || 0), 0),
  };

  return (
    <div className="space-y-lg">
      <div>
        <h2 className="text-heading-lg">External Access Links</h2>
        <p className="text-body-sm text-muted-foreground">
          Manage all external review links for campaigns, knowledge pages, and projects
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-md">
        <Card>
          <CardHeader className="pb-sm">
            <CardTitle className="text-body-sm text-muted-foreground">Total Links</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-heading-lg font-semibold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-sm">
            <CardTitle className="text-body-sm text-muted-foreground">Campaign Links</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-heading-lg font-semibold text-primary">{stats.campaigns}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-sm">
            <CardTitle className="text-body-sm text-muted-foreground">Knowledge Pages</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-heading-lg font-semibold text-primary">{stats.knowledge}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-sm">
            <CardTitle className="text-body-sm text-muted-foreground">Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-heading-lg font-semibold text-primary">{stats.projects}</p>
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
            <CardTitle className="text-body-sm text-muted-foreground flex items-center gap-1">
              <MousePointerClick className="h-4 w-4" /> Total Clicks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-heading-lg font-semibold">{stats.totalClicks}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex gap-md">
        <Input
          placeholder="Search by title, entity, email, or name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {/* Unified Links Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Title / Entity</TableHead>
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
              {filteredLinks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    No external links found
                  </TableCell>
                </TableRow>
              ) : (
                filteredLinks.map((link) => (
                  <TableRow key={`${link.type}-${link.id}`}>
                    <TableCell>{getTypeBadge(link)}</TableCell>
                    <TableCell>
                      <div className="space-y-xs">
                        <p className="text-body-sm font-medium">{link.title}</p>
                        {link.entity && (
                          <p className="text-metadata text-muted-foreground">{link.entity}</p>
                        )}
                      </div>
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
                        <span className="text-muted-foreground text-body-sm">—</span>
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
                            <Copy className="h-4 w-4 mr-2" />
                            Copy Link
                          </DropdownMenuItem>
                          {link.is_active ? (
                            <DropdownMenuItem onClick={() => handleDeactivate(link)}>
                              <PowerOff className="h-4 w-4 mr-2" />
                              Deactivate
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => handleReactivate(link)}>
                              <Power className="h-4 w-4 mr-2" />
                              Reactivate
                            </DropdownMenuItem>
                          )}
                          {link.type === 'campaign' && (
                            <DropdownMenuItem onClick={() => setExtendLinkId(link.id)}>
                              <Calendar className="h-4 w-4 mr-2" />
                              Extend Expiration
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setDeleteLink({ id: link.id, type: link.type })}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
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
            <DialogTitle>Extend Link Expiration</DialogTitle>
            <DialogDescription>
              Set a new expiration date for this review link
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-sm">
            <Label>New Expiration Date</Label>
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
            <DialogTitle>Delete External Link</DialogTitle>
            <DialogDescription>
              {deleteLink?.type === 'campaign' 
                ? "Are you sure you want to delete this review link? This action cannot be undone."
                : "Are you sure you want to remove public access from this knowledge page? The page will become private and all tracking data will be cleared."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteLink(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
