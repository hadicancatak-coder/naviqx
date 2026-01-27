import { useState } from "react";
import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ExternalLink, Trash2, MessageCircle, ChevronDown, User, Calendar, Link2, ZoomIn, Edit, Save, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { CampaignVersion } from "@/hooks/useCampaignVersions";
import { useVersionComments } from "@/hooks/useVersionComments";
import { VersionComments } from "./VersionComments";
import { ImageLightbox } from "@/components/ui/image-lightbox";

interface VersionCardProps {
  version: CampaignVersion;
  campaignId: string;
  onDelete: (versionId: string) => void;
  onEdit?: (versionId: string, data: { versionNotes?: string; assetLink?: string }) => void;
  isDeleting?: boolean;
  isEditing?: boolean;
}

export function VersionCard({ version, campaignId, onDelete, onEdit, isDeleting, isEditing: externalIsEditing }: VersionCardProps) {
  const [showComments, setShowComments] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editNotes, setEditNotes] = useState(version.version_notes || "");
  const [editAssetLink, setEditAssetLink] = useState(version.asset_link || "");
  const [saving, setSaving] = useState(false);
  
  const { comments } = useVersionComments(version.id);
  const commentCount = comments.length;

  const handleSave = async () => {
    if (!onEdit) return;
    setSaving(true);
    try {
      await onEdit(version.id, { 
        versionNotes: editNotes, 
        assetLink: editAssetLink 
      });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditNotes(version.version_notes || "");
    setEditAssetLink(version.asset_link || "");
    setEditing(false);
  };

  return (
    <>
      <Card className="p-md border-border bg-card hover:bg-card-hover transition-smooth">
        <div className="flex gap-md">
          {/* Image Preview */}
          <div className="flex-shrink-0">
            {version.image_url ? (
              <div 
                className="relative group cursor-pointer"
                onClick={() => setLightboxOpen(true)}
              >
                <img 
                  src={version.image_url} 
                  alt={`Version ${version.version_number}`}
                  className="w-[200px] h-[150px] object-cover rounded-lg border border-border"
                />
                <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                  <ZoomIn className="size-8 text-foreground" />
                </div>
              </div>
            ) : (
              <div className="w-[200px] h-[150px] rounded-lg bg-muted flex items-center justify-center border border-border">
                <p className="text-muted-foreground text-metadata">No image</p>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-sm">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-sm">
                <Badge variant="outline" className="font-mono">v{version.version_number}</Badge>
                <span className="text-metadata text-muted-foreground flex items-center gap-1">
                  <Calendar className="size-3" />
                  {version.created_at ? format(new Date(version.created_at), 'MMM d, yyyy') : '—'}
                </span>
                {version.creator_name && (
                  <span className="text-metadata text-muted-foreground flex items-center gap-1">
                    <User className="size-3" />
                    {version.creator_name}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {onEdit && !editing && (
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => setEditing(true)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Edit className="size-3.5" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => onDelete(version.id)}
                  disabled={isDeleting}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 />
                </Button>
              </div>
            </div>

            {/* Version Notes - Editable */}
            {editing ? (
              <div className="space-y-sm">
                <div>
                  <label className="text-metadata text-muted-foreground mb-1 block">Version Notes</label>
                  <Textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Version notes..."
                    className="min-h-[60px]"
                  />
                </div>
                <div>
                  <label className="text-metadata text-muted-foreground mb-1 block">Asset Link</label>
                  <Input
                    value={editAssetLink}
                    onChange={(e) => setEditAssetLink(e.target.value)}
                    placeholder="https://drive.google.com/..."
                  />
                </div>
                <div className="flex gap-sm">
                  <Button size="sm" onClick={handleSave} disabled={saving}>
                    {saving ? <Loader2 className="animate-spin" /> : <Save className="size-3.5" />}
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleCancel}>
                    <X className="size-3.5" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {version.version_notes && (
                  <div className="bg-muted/50 rounded-md p-sm border border-border/50">
                    <p className="text-body-sm text-foreground">{version.version_notes}</p>
                  </div>
                )}

                {/* Asset Link */}
                {version.asset_link && (
                  <a 
                    href={version.asset_link.startsWith('http') ? version.asset_link : `https://${version.asset_link}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-body-sm text-primary hover:underline"
                  >
                    <Link2 className="size-3" />
                    {(() => {
                      try {
                        const url = version.asset_link.startsWith('http') ? version.asset_link : `https://${version.asset_link}`;
                        return new URL(url).hostname;
                      } catch {
                        return 'View Asset';
                      }
                    })()}
                    <ExternalLink className="size-3" />
                  </a>
                )}
              </>
            )}

            {/* Actions Row */}
            {!editing && (
              <div className="flex items-center gap-sm pt-sm">
                <Button
                  variant={showComments ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => setShowComments(!showComments)}
                  className="text-metadata"
                >
                  <MessageCircle />
                  Comments
                  {commentCount > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                      {commentCount}
                    </Badge>
                  )}
                  <ChevronDown className={cn("size-3 ml-1 transition-transform", showComments && "rotate-180")} />
                </Button>
              </div>
            )}

            {/* Collapsible Comments */}
            <Collapsible open={showComments}>
              <CollapsibleContent className="pt-sm">
                <VersionComments versionId={version.id} campaignId={campaignId} />
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>
      </Card>

      {/* Image Lightbox */}
      {version.image_url && (
        <ImageLightbox
          images={[{ url: version.image_url, caption: version.version_notes || undefined }]}
          initialIndex={0}
          open={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </>
  );
}
