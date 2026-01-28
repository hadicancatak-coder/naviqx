import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ExternalLink, MessageCircle, Loader2, Edit, Save, Plus, Copy, Check } from "lucide-react";
import { useCampaignEntityTracking } from "@/hooks/useCampaignEntityTracking";
import { useCampaignVersions } from "@/hooks/useCampaignVersions";
import { useCampaignMetadata } from "@/hooks/useCampaignMetadata";
import { useUpdateUtmCampaign } from "@/hooks/useUtmCampaigns";
import { CampaignComments } from "./CampaignComments";
import { VersionCard } from "./VersionCard";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { ENTITY_STATUS_CONFIG, EntityTrackingStatus } from "@/domain/campaigns";

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
  const [copied, setCopied] = useState(false);
  
  // Add version state
  const [isAddingVersion, setIsAddingVersion] = useState(false);
  const [versionNotes, setVersionNotes] = useState("");
  const [versionAssetLink, setVersionAssetLink] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [deletingVersionId, setDeletingVersionId] = useState<string | null>(null);

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
  const { useVersions, createVersion, updateVersion, deleteVersion } = useCampaignVersions();
  const { uploadImage } = useCampaignMetadata();
  const updateMutation = useUpdateUtmCampaign();
  const { data: versions = [] } = useVersions(campaignId);
  const entities = getEntitiesForCampaign(campaignId);

  const handleEditVersion = async (versionId: string, data: { versionNotes?: string; assetLink?: string; imageFile?: File }) => {
    let imageUrl: string | undefined;
    let imageFileSize: number | undefined;

    // Upload new image if provided
    if (data.imageFile) {
      const result = await uploadImage.mutateAsync({ campaignId, file: data.imageFile });
      imageUrl = result.publicUrl;
      imageFileSize = result.fileSize;
    }

    await updateVersion.mutateAsync({
      versionId,
      versionNotes: data.versionNotes,
      assetLink: data.assetLink,
      imageUrl,
      imageFileSize,
    });
  };

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({
        id: campaignId,
        name,
        landing_page: landingPage || null,
        description: description || null,
      });
      setIsEditing(false);
      toast.success("Campaign updated");
    } catch {
      toast.error("Failed to update campaign");
    }
  };

  const handleCopyLandingPage = async () => {
    if (!campaign?.landing_page) return;
    await navigator.clipboard.writeText(campaign.landing_page);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
        <DialogContent className="max-w-2xl liquid-glass-elevated">
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
        <DialogContent 
          onInteractOutside={(e) => {
            // Allow lightbox clicks to pass through
            const target = e.target as HTMLElement;
            if (target.closest('[data-lightbox]')) {
              return;
            }
            e.preventDefault();
          }}
          className={cn(
          "max-h-[90vh] p-0 gap-0 liquid-glass-dialog border-border/50",
          showComments ? "max-w-[1100px]" : "max-w-3xl"
        )}>
          <div className="flex h-full max-h-[90vh]">
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Header */}
              <DialogHeader className="px-lg pt-lg pb-md border-b border-border/50">
                <div className="flex items-start justify-between gap-md">
                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <Input 
                        value={name} 
                        onChange={(e) => setName(e.target.value)} 
                        className="text-heading-md font-semibold mb-sm bg-card" 
                      />
                    ) : (
                      <DialogTitle className="text-heading-md text-foreground">{campaign.name}</DialogTitle>
                    )}
                    {isEditing ? (
                      <Input 
                        value={description} 
                        onChange={(e) => setDescription(e.target.value)} 
                        placeholder="Short description..."
                        className="text-body-sm text-muted-foreground bg-card"
                      />
                    ) : (
                      <DialogDescription className="mt-sm text-body-sm">
                        {campaign.description || "No description"}
                      </DialogDescription>
                    )}
                  </div>
                  <div className="flex items-center gap-sm flex-shrink-0">
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

              <ScrollArea className="flex-1 px-lg py-md">
                <div className="space-y-lg">
                  {/* Landing Page */}
<Card className="p-md bg-card border-border">
                    <Label className="text-metadata text-muted-foreground">Landing Page</Label>
                    {isEditing ? (
                      <Input
                        value={landingPage}
                        onChange={(e) => setLandingPage(e.target.value)}
                        placeholder="https://example.com"
                        className="mt-sm bg-background"
                      />
                    ) : campaign.landing_page ? (
                      <div className="flex items-center gap-sm mt-sm flex-wrap">
                        {/* Prominent View LP Button */}
                        <Button 
                          variant="default" 
                          size="sm"
                          onClick={() => {
                            const url = campaign.landing_page.startsWith('http') 
                              ? campaign.landing_page 
                              : `https://${campaign.landing_page}`;
                            window.open(url, '_blank', 'noopener,noreferrer');
                          }}
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          View LP
                        </Button>
                        
                        {/* URL text + copy button */}
                        <span className="text-body-sm text-muted-foreground break-all flex-1">
                          {campaign.landing_page}
                        </span>
                        <Button 
                          variant="ghost" 
                          size="icon-sm" 
                          onClick={handleCopyLandingPage}
                          className="flex-shrink-0"
                        >
                          {copied ? <Check className="text-success" /> : <Copy />}
                        </Button>
                      </div>
                    ) : (
                      <p className="text-muted-foreground mt-sm text-body-sm">Not set</p>
                    )}
                  </Card>

                  {/* Active Entities */}
                  <div>
                    <Label className="text-metadata text-muted-foreground">Active Entities</Label>
                    <div className="flex flex-wrap gap-sm mt-sm">
                      {entities.length === 0 ? (
                        <p className="text-muted-foreground text-body-sm">Not live on any entity</p>
                      ) : (
                        entities.map((e) => {
                          const statusConfig = ENTITY_STATUS_CONFIG[e.status as EntityTrackingStatus] || ENTITY_STATUS_CONFIG.Draft;
                          return (
                            <Badge 
                              key={e.id} 
                              className={cn("text-metadata", statusConfig.bgColor, statusConfig.color)}
                            >
                              {e.entity}
                              <span className="ml-1 opacity-70">• {e.status}</span>
                            </Badge>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Version History */}
                  <div>
                    <div className="flex items-center justify-between mb-md">
                      <h3 className="text-heading-sm font-semibold text-foreground">Version History</h3>
                      <Button size="sm" variant="outline" onClick={() => setIsAddingVersion(true)}>
                        <Plus />
                        Add Version
                      </Button>
                    </div>

                    {/* Add Version Form */}
                    {isAddingVersion && (
                      <Card className="p-md mb-md border-primary/30 bg-card">
                        <div className="space-y-md">
                          <div>
                            <Label className="text-body-sm">Version Notes *</Label>
                            <Textarea
                              value={versionNotes}
                              onChange={(e) => setVersionNotes(e.target.value)}
                              placeholder="Describe what changed in this version..."
                              rows={3}
                              className="mt-sm bg-background"
                            />
                          </div>
                          <div>
                            <Label className="text-body-sm">Asset Link</Label>
                            <Input
                              value={versionAssetLink}
                              onChange={(e) => setVersionAssetLink(e.target.value)}
                              placeholder="https://drive.google.com/..."
                              className="mt-sm bg-background"
                            />
                          </div>
                          <div>
                            <Label className="text-body-sm">Creative Image (max 2MB)</Label>
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                              className="mt-sm bg-background"
                            />
                          </div>
                          <div className="flex justify-end gap-sm pt-sm">
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
                      <Card className="p-lg border-dashed">
                        <p className="text-muted-foreground text-body-sm text-center">
                          No versions yet. Add your first version to track creative changes.
                        </p>
                      </Card>
                    ) : (
                      <div className="space-y-md">
                        {versions.map((v) => (
                          <VersionCard
                            key={v.id}
                            version={v}
                            campaignId={campaignId}
                            onDelete={(id) => setDeletingVersionId(id)}
                            onEdit={handleEditVersion}
                            isDeleting={deleteVersion.isPending}
                            isEditing={updateVersion.isPending}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </ScrollArea>
            </div>

            {/* Comments Panel */}
            {showComments && (
              <>
                <Separator orientation="vertical" />
                <div className="w-[380px] flex flex-col bg-card/50">
                  <div className="px-md py-sm border-b border-border/50">
                    <h3 className="text-heading-sm font-semibold text-foreground">Comments</h3>
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
        <AlertDialogContent className="liquid-glass-elevated">
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
