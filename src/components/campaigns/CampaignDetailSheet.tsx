import { useState } from "react";
import { X, ExternalLink, Copy, Check, Link2, ImageIcon, ZoomIn, Plus, Pencil, Trash2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import { VersionComments } from "./VersionComments";
import { AddVersionDialog } from "./AddVersionDialog";
import { EditVersionDialog } from "./EditVersionDialog";
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
import { useCampaignVersions, CampaignVersion } from "@/hooks/useCampaignVersions";
import { CampaignRowData } from "./CampaignRow";
import { ENTITY_STATUS_CONFIG } from "@/domain/campaigns";
import { normalizeUrl } from "@/lib/urlHelpers";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CampaignDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: CampaignRowData | null;
}

export function CampaignDetailSheet({ open, onOpenChange, campaign }: CampaignDetailSheetProps) {
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [copiedLP, setCopiedLP] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [addVersionOpen, setAddVersionOpen] = useState(false);
  const [editingVersion, setEditingVersion] = useState<CampaignVersion | null>(null);
  const [deleteVersionId, setDeleteVersionId] = useState<string | null>(null);

  const { useVersions, deleteVersion } = useCampaignVersions();
  const { data: versions = [], isLoading: versionsLoading } = useVersions(campaign?.id || "");

  // Auto-select first version
  const selectedVersion = versions.find(v => v.id === selectedVersionId) || versions[0] || null;
  const imageUrl = selectedVersion?.image_url || selectedVersion?.asset_link;

  const handleCopyLP = () => {
    if (campaign?.landing_page) {
      navigator.clipboard.writeText(campaign.landing_page);
      setCopiedLP(true);
      toast.success("Link copied");
      setTimeout(() => setCopiedLP(false), 2000);
    }
  };

  const handleOpenLP = () => {
    if (campaign?.landing_page) {
      try {
        const url = normalizeUrl(campaign.landing_page);
        window.open(url, "_blank");
      } catch {
        toast.error("Invalid URL");
      }
    }
  };

  const handleDeleteVersion = async () => {
    if (!deleteVersionId) return;
    try {
      await deleteVersion.mutateAsync(deleteVersionId);
      if (selectedVersionId === deleteVersionId) {
        setSelectedVersionId(null);
      }
      setDeleteVersionId(null);
    } catch (error) {
      console.error("Failed to delete version:", error);
    }
  };

  if (!campaign) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col">
          <SheetHeader className="p-lg border-b border-border shrink-0">
            <div className="flex items-start justify-between gap-md pr-8">
              <div className="space-y-xs">
                <SheetTitle className="text-heading-md font-semibold">
                  {campaign.name}
                </SheetTitle>
                {campaign.campaign_type && (
                  <Badge variant="outline" className="text-metadata">
                    {campaign.campaign_type}
                  </Badge>
                )}
              </div>
            </div>
          </SheetHeader>

          <ScrollArea className="flex-1">
            <div className="p-lg space-y-lg">
              {/* Campaign Info */}
              <div className="space-y-sm">
                {/* Landing Page */}
                {campaign.landing_page && (
                  <div className="flex items-center gap-sm">
                    <Link2 className="size-4 text-muted-foreground shrink-0" />
                    <span className="text-body-sm text-muted-foreground truncate flex-1">
                      {campaign.landing_page}
                    </span>
                    <Button variant="ghost" size="icon" className="size-7 shrink-0" onClick={handleCopyLP}>
                      {copiedLP ? <Check className="size-3.5 text-success-text" /> : <Copy className="size-3.5" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="size-7 shrink-0" onClick={handleOpenLP}>
                      <ExternalLink className="size-3.5" />
                    </Button>
                  </div>
                )}

                {/* Entities */}
                {campaign.entities.length > 0 && (
                  <div className="flex items-center gap-sm flex-wrap">
                    {campaign.entities.map((e) => {
                      const config = ENTITY_STATUS_CONFIG[e.status] || ENTITY_STATUS_CONFIG.Draft;
                      return (
                        <Badge
                          key={e.trackingId}
                          variant="outline"
                          className={cn("text-metadata", config.bgColor)}
                        >
                          {e.entity}
                          <span className={cn("ml-1", config.color)}>• {e.status}</span>
                        </Badge>
                      );
                    })}
                  </div>
                )}

                {/* Description */}
                {campaign.description && (
                  <p className="text-body-sm text-muted-foreground">{campaign.description}</p>
                )}
              </div>

              {/* Versions Section */}
              <div className="space-y-sm">
                <div className="flex items-center justify-between">
                  <h3 className="text-body font-medium text-foreground">Versions</h3>
                  <Button variant="outline" size="sm" onClick={() => setAddVersionOpen(true)}>
                    <Plus className="size-3.5 mr-1" />
                    Add Version
                  </Button>
                </div>

                {versionsLoading ? (
                  <p className="text-metadata text-muted-foreground">Loading versions...</p>
                ) : versions.length === 0 ? (
                  <div className="bg-muted/50 rounded-lg p-md text-center">
                    <p className="text-body-sm text-muted-foreground">No versions yet</p>
                    <Button variant="link" size="sm" onClick={() => setAddVersionOpen(true)}>
                      Create the first version
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-xs">
                    {versions.map((version) => (
                      <div
                        key={version.id}
                        onClick={() => setSelectedVersionId(version.id)}
                        className={cn(
                          "flex items-center gap-sm p-sm rounded-lg cursor-pointer transition-smooth",
                          selectedVersion?.id === version.id
                            ? "bg-primary/10 border border-primary/30"
                            : "bg-card border border-border hover:bg-card-hover"
                        )}
                      >
                        {/* Thumbnail */}
                        {version.image_url || version.asset_link ? (
                          <img
                            src={version.image_url || version.asset_link || ""}
                            alt=""
                            className="w-12 h-12 rounded object-cover shrink-0"
                            onError={(e) => (e.currentTarget.style.display = "none")}
                          />
                        ) : (
                          <div className="w-12 h-12 rounded bg-muted flex items-center justify-center shrink-0">
                            <ImageIcon className="size-5 text-muted-foreground" />
                          </div>
                        )}

                        {/* Version Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-xs">
                            <Badge variant="outline" className="text-metadata shrink-0">
                              V{version.version_number}
                            </Badge>
                            <span className="text-body-sm text-foreground truncate">
                              {version.version_notes || "No notes"}
                            </span>
                          </div>
                          <p className="text-metadata text-muted-foreground">
                            {format(new Date(version.created_at), "MMM d, yyyy")}
                            {version.creator_name && ` • ${version.creator_name}`}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-xs shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingVersion(version);
                            }}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-destructive hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteVersionId(version.id);
                            }}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected Version Detail */}
              {selectedVersion && (
                <div className="space-y-md border-t border-border pt-lg">
                  <h3 className="text-body font-medium text-foreground">
                    Version {selectedVersion.version_number} Details
                  </h3>

                  {/* Large Preview */}
                  {imageUrl ? (
                    <div
                      className="relative group cursor-pointer aspect-video w-full rounded-lg overflow-hidden border border-border"
                      onClick={() => setLightboxOpen(true)}
                    >
                      <img
                        src={imageUrl}
                        alt={`V${selectedVersion.version_number}`}
                        className="w-full h-full object-cover"
                        onError={(e) => (e.currentTarget.style.display = "none")}
                      />
                      <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <ZoomIn className="size-10 text-foreground" />
                      </div>
                    </div>
                  ) : (
                    <div className="aspect-video w-full rounded-lg bg-muted flex items-center justify-center border border-border">
                      <ImageIcon className="size-16 text-muted-foreground" />
                    </div>
                  )}

                  {/* Version Notes */}
                  {selectedVersion.version_notes && (
                    <div className="bg-muted/50 rounded-lg p-sm border border-border/50">
                      <p className="text-body-sm">{selectedVersion.version_notes}</p>
                    </div>
                  )}

                  {/* Links */}
                  <div className="flex items-center gap-md flex-wrap">
                    {selectedVersion.asset_link && (
                      <a
                        href={normalizeUrl(selectedVersion.asset_link)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline text-body-sm"
                      >
                        <Link2 className="size-3.5" />
                        View Asset
                        <ExternalLink className="size-3" />
                      </a>
                    )}
                    {selectedVersion.landing_page && (
                      <a
                        href={normalizeUrl(selectedVersion.landing_page)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline text-body-sm"
                      >
                        <ExternalLink className="size-3.5" />
                        Landing Page
                      </a>
                    )}
                  </div>

                  {/* Comments */}
                  <div className="border-t border-border pt-md">
                    <VersionComments versionId={selectedVersion.id} campaignId={campaign.id} />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Add Version Dialog */}
      <AddVersionDialog
        open={addVersionOpen}
        onOpenChange={setAddVersionOpen}
        campaignId={campaign.id}
        campaignName={campaign.name}
      />

      {/* Edit Version Dialog */}
      <EditVersionDialog
        version={editingVersion}
        open={!!editingVersion}
        onOpenChange={(open) => !open && setEditingVersion(null)}
      />

      {/* Delete Version Confirmation */}
      <AlertDialog open={!!deleteVersionId} onOpenChange={() => setDeleteVersionId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Version?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this version and all its comments. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteVersion}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Lightbox */}
      {imageUrl && (
        <ImageLightbox
          images={[{ url: imageUrl }]}
          initialIndex={0}
          open={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </>
  );
}
