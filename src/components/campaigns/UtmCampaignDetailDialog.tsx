import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ExternalLink, MessageCircle, FileImage, Link2, Loader2, Edit, Save, Plus, Trash2, ChevronDown, ChevronRight, User, Calendar } from "lucide-react";
import { useCampaignEntityTracking } from "@/hooks/useCampaignEntityTracking";
import { useCampaignVersions } from "@/hooks/useCampaignVersions";
import { useCampaignMetadata } from "@/hooks/useCampaignMetadata";
import { useUpdateUtmCampaign } from "@/hooks/useUtmCampaigns";
import { CampaignComments } from "./CampaignComments";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface UtmCampaignDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
}

export function UtmCampaignDetailDialog({ open, onOpenChange, campaignId }: UtmCampaignDetailDialogProps) {
  const [showComments, setShowComments] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [landingPage, setLandingPage] = useState("");
  
  // Add version state
  const [isAddingVersion, setIsAddingVersion] = useState(false);
  const [versionNotes, setVersionNotes] = useState("");
  const [versionAssetLink, setVersionAssetLink] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [deletingVersionId, setDeletingVersionId] = useState<string | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const { data: campaign, isLoading } = useQuery({
    queryKey: ["utm-campaign", campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("utm_campaigns")
        .select("*")
        .eq("id", campaignId)
        .single();
      if (error) throw error;
      
      setName(data.name || "");
      setDescription(data.description || "");
      setLandingPage(data.landing_page || "");
      
      return data;
    },
    enabled: open && !!campaignId,
  });

  const { getEntitiesForCampaign } = useCampaignEntityTracking();
  const { useVersions, createVersion, deleteVersion } = useCampaignVersions();
  const { uploadImage } = useCampaignMetadata();
  const updateMutation = useUpdateUtmCampaign();
  const { data: versions = [] } = useVersions(campaignId);
  const entities = getEntitiesForCampaign(campaignId);

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({
        id: campaignId,
        name,
        landing_page: landingPage || null,
      });
      setIsEditing(false);
      toast.success("Campaign updated");
    } catch {
      toast.error("Failed to update campaign");
    }
  };

  const handleAddVersion = async () => {
    if (!versionNotes.trim()) {
      toast.error("Please provide version notes");
      return;
    }

    try {
      let imageUrl: string | undefined;
      let imageFileSize: number | undefined;

      if (imageFile) {
        const result = await uploadImage.mutateAsync({ campaignId, file: imageFile });
        imageUrl = result.publicUrl;
        imageFileSize = result.fileSize;
      }

      await createVersion.mutateAsync({
        campaignId,
        name,
        landingPage: landingPage || undefined,
        description: description || undefined,
        imageUrl,
        imageFileSize,
        assetLink: versionAssetLink || undefined,
        versionNotes,
      });

      setVersionNotes("");
      setVersionAssetLink("");
      setImageFile(null);
      setIsAddingVersion(false);
      toast.success("Version saved");
    } catch {
      toast.error("Failed to save version");
    }
  };

  const handleDeleteVersion = async (versionId: string) => {
    try {
      await deleteVersion.mutateAsync(versionId);
      toast.success("Version deleted");
      setDeletingVersionId(null);
    } catch {
      toast.error("Failed to delete version");
    }
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl bg-card">
          <div className="flex items-center justify-center p-lg">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!campaign) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className={cn(
          "max-h-[85vh] p-0 gap-0 bg-card",
          showComments ? "max-w-[1000px]" : "max-w-2xl"
        )}>
          <div className="flex h-full max-h-[85vh]">
            <div className="flex-1 flex flex-col overflow-hidden">
              <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {isEditing ? (
                      <Input 
                        value={name} 
                        onChange={(e) => setName(e.target.value)} 
                        className="text-xl font-semibold mb-2 bg-background" 
                      />
                    ) : (
                      <DialogTitle className="text-xl text-foreground">{campaign.name}</DialogTitle>
                    )}
                    {isEditing ? (
                      <Input 
                        value={description} 
                        onChange={(e) => setDescription(e.target.value)} 
                        placeholder="Short description..."
                        className="text-sm text-muted-foreground bg-background"
                      />
                    ) : (
                      <DialogDescription className="mt-1">
                        {campaign.description || "No description"}
                      </DialogDescription>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant={showComments ? "default" : "outline"}
                      size="sm"
                      onClick={() => setShowComments(!showComments)}
                    >
                      <MessageCircle />
                      Comments
                    </Button>
                    {isEditing ? (
                      <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending}>
                        {updateMutation.isPending ? (
                          <Loader2 className="animate-spin" />
                        ) : (
                          <Save />
                        )}
                        Save
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                        <Edit />
                        Edit
                      </Button>
                    )}
                  </div>
                </div>
              </DialogHeader>

              <ScrollArea className="flex-1 px-6 py-4">
                <div className="space-y-lg">
                  {/* Landing Page */}
                  <div>
                    <Label className="text-sm text-muted-foreground">Landing Page</Label>
                    {isEditing ? (
                      <Input
                        value={landingPage}
                        onChange={(e) => setLandingPage(e.target.value)}
                        placeholder="https://example.com"
                        className="mt-1 bg-background"
                      />
                    ) : campaign.landing_page ? (
                      <a 
                        href={campaign.landing_page} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-primary hover:underline flex items-center gap-1 mt-1 break-all"
                      >
                        {campaign.landing_page}
                        <ExternalLink className="h-3 w-3 flex-shrink-0" />
                      </a>
                    ) : (
                      <p className="text-muted-foreground mt-1">Not set</p>
                    )}
                  </div>

                  {/* Active Entities */}
                  <div>
                    <Label className="text-sm text-muted-foreground">Active Entities</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {entities.length === 0 ? (
                        <p className="text-muted-foreground text-sm">Not live on any entity</p>
                      ) : (
                        entities.map((e) => (
                          <Badge key={e.id} variant="secondary">{e.entity}</Badge>
                        ))
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Version History */}
                  <div>
                    <div className="flex items-center justify-between mb-md">
                      <h3 className="font-semibold text-foreground">Version History</h3>
                      <Button size="sm" variant="outline" onClick={() => setIsAddingVersion(true)}>
                        <Plus />
                        Add Version
                      </Button>
                    </div>

                    {/* Add Version Form */}
                    {isAddingVersion && (
                      <Card className="p-md mb-md border-primary/20 bg-background">
                        <div className="space-y-3">
                          <div>
                            <Label>Version Notes *</Label>
                            <Textarea
                              value={versionNotes}
                              onChange={(e) => setVersionNotes(e.target.value)}
                              placeholder="Describe what changed..."
                              rows={2}
                              className="mt-1 bg-card"
                            />
                          </div>
                          <div>
                            <Label>Asset Link</Label>
                            <Input
                              value={versionAssetLink}
                              onChange={(e) => setVersionAssetLink(e.target.value)}
                              placeholder="https://drive.google.com/..."
                              className="mt-1 bg-card"
                            />
                          </div>
                          <div>
                            <Label>Image (max 2MB)</Label>
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                              className="mt-1 bg-card"
                            />
                          </div>
                          <div className="flex justify-end gap-2 pt-2">
                            <Button variant="outline" size="sm" onClick={() => {
                              setIsAddingVersion(false);
                              setVersionNotes("");
                              setVersionAssetLink("");
                              setImageFile(null);
                            }}>
                              Cancel
                            </Button>
                            <Button size="sm" onClick={handleAddVersion} disabled={!versionNotes.trim() || createVersion.isPending}>
                              {createVersion.isPending && <Loader2 className="animate-spin" />}
                              Save Version
                            </Button>
                          </div>
                        </div>
                      </Card>
                    )}

                    {versions.length === 0 ? (
                      <p className="text-muted-foreground text-sm text-center py-6">No versions yet</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow className="border-border">
                            <TableHead className="w-16 text-muted-foreground">Version</TableHead>
                            <TableHead className="w-28 text-muted-foreground">Date</TableHead>
                            <TableHead className="text-muted-foreground">Notes</TableHead>
                            <TableHead className="w-16 text-muted-foreground">Asset</TableHead>
                            <TableHead className="w-12"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {versions.map((v) => {
                            const isExpanded = selectedVersionId === v.id;
                            return (
                              <>
                                <TableRow 
                                  key={v.id} 
                                  className="border-border cursor-pointer hover:bg-muted/50 transition-colors"
                                  onClick={() => setSelectedVersionId(isExpanded ? null : v.id)}
                                >
                                  <TableCell>
                                    <div className="flex items-center gap-1">
                                      {isExpanded ? (
                                        <ChevronDown className="size-3 text-muted-foreground" />
                                      ) : (
                                        <ChevronRight className="size-3 text-muted-foreground" />
                                      )}
                                      <Badge variant="outline">v{v.version_number}</Badge>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-sm text-muted-foreground">
                                    {v.created_at ? format(new Date(v.created_at), 'MMM d') : '-'}
                                  </TableCell>
                                  <TableCell className="text-sm text-foreground">{v.version_notes || '-'}</TableCell>
                                  <TableCell>
                                    <div className="flex gap-2">
                                      {v.image_url && (
                                        <a href={v.image_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                                          <FileImage className="size-4 text-primary hover:text-primary/80" />
                                        </a>
                                      )}
                                      {v.asset_link && (
                                        <a href={v.asset_link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                                          <Link2 className="size-4 text-primary hover:text-primary/80" />
                                        </a>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Button
                                      variant="ghost"
                                      size="icon-xs"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDeletingVersionId(v.id);
                                      }}
                                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                    >
                                      <Trash2 />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                                {isExpanded && (
                                  <TableRow key={`${v.id}-details`} className="border-border bg-muted/30">
                                    <TableCell colSpan={5} className="p-md">
                                      <div className="space-y-sm">
                                        <div className="grid grid-cols-2 gap-md text-body-sm">
                                          <div className="flex items-center gap-sm">
                                            <Calendar className="size-4 text-muted-foreground" />
                                            <span className="text-muted-foreground">Created:</span>
                                            <span className="text-foreground">
                                              {v.created_at ? format(new Date(v.created_at), 'MMM d, yyyy • HH:mm') : '-'}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <User className="size-4 text-muted-foreground" />
                                            <span className="text-muted-foreground">Created by:</span>
                                            <span className="text-foreground">{v.created_by || 'Unknown'}</span>
                                          </div>
                                        </div>
                                        
                                        {v.version_notes && (
                                          <div>
                                            <span className="text-sm text-muted-foreground">Notes:</span>
                                            <p className="mt-1 text-sm text-foreground bg-background rounded-md p-2 border border-border">
                                              {v.version_notes}
                                            </p>
                                          </div>
                                        )}

                                        <div className="flex gap-md">
                                          {v.image_url && (
                                            <a 
                                              href={v.image_url} 
                                              target="_blank" 
                                              rel="noopener noreferrer"
                                              className="flex items-center gap-2 text-sm text-primary hover:underline"
                                            >
                                              <FileImage className="size-4" />
                                              View Image
                                            </a>
                                          )}
                                          {v.asset_link && (
                                            <a 
                                              href={v.asset_link} 
                                              target="_blank" 
                                              rel="noopener noreferrer"
                                              className="flex items-center gap-2 text-sm text-primary hover:underline"
                                            >
                                              <Link2 className="size-4" />
                                              Open Asset Link
                                            </a>
                                          )}
                                        </div>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                )}
                              </>
                            );
                          })}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                </div>
              </ScrollArea>
            </div>

            {/* Comments Panel */}
            {showComments && (
              <>
                <Separator orientation="vertical" />
                <div className="w-[350px] flex flex-col bg-background">
                  <div className="px-4 py-3 border-b border-border">
                    <h3 className="font-semibold text-sm text-foreground">Comments</h3>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <CampaignComments campaignId={campaignId} />
                  </div>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Version Confirmation */}
      <AlertDialog open={!!deletingVersionId} onOpenChange={() => setDeletingVersionId(null)}>
        <AlertDialogContent className="bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Version</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deletingVersionId && handleDeleteVersion(deletingVersionId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}