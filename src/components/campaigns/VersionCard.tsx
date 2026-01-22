import { useState } from "react";
import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ExternalLink, Trash2, MessageCircle, ChevronDown, User, Calendar, Link2, ZoomIn } from "lucide-react";
import { cn } from "@/lib/utils";
import { CampaignVersion } from "@/hooks/useCampaignVersions";
import { useVersionComments } from "@/hooks/useVersionComments";
import { VersionComments } from "./VersionComments";
import { ImageLightbox } from "@/components/ui/image-lightbox";

interface VersionCardProps {
  version: CampaignVersion;
  campaignId: string;
  onDelete: (versionId: string) => void;
  isDeleting?: boolean;
}

export function VersionCard({ version, campaignId, onDelete, isDeleting }: VersionCardProps) {
  const [showComments, setShowComments] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const { comments } = useVersionComments(version.id);
  const commentCount = comments.length;

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
                {version.created_by && (
                  <span className="text-metadata text-muted-foreground flex items-center gap-1">
                    <User className="size-3" />
                    {version.created_by}
                  </span>
                )}
              </div>
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

            {/* Version Notes */}
            {version.version_notes && (
              <div className="bg-muted/50 rounded-md p-sm border border-border/50">
                <p className="text-body-sm text-foreground">{version.version_notes}</p>
              </div>
            )}

            {/* Asset Link */}
            {version.asset_link && (
              <a 
                href={version.asset_link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-body-sm text-primary hover:underline"
              >
                <Link2 className="size-3" />
                {(() => {
                  try {
                    return new URL(version.asset_link).hostname;
                  } catch {
                    return 'View Asset';
                  }
                })()}
                <ExternalLink className="size-3" />
              </a>
            )}

            {/* Actions Row */}
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
