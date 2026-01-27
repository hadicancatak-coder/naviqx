import { useState } from "react";
import { MessageSquare, ExternalLink, Calendar, Loader2, Image as ImageIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface Version {
  id: string;
  utm_campaign_id: string;
  version_number: number;
  version_notes: string | null;
  image_url: string | null;
  asset_link: string | null;
  created_at: string;
}

interface ExternalComment {
  id: string;
  campaign_id: string | null;
  version_id: string | null;
  entity: string;
  reviewer_name: string;
  reviewer_email: string;
  comment_text: string;
  comment_type: string | null;
  created_at: string;
}

interface ExternalVersionGalleryProps {
  versions: Version[];
  comments: ExternalComment[];
  onSubmitFeedback: (versionId: string, text: string) => Promise<void>;
  submitting: { [key: string]: boolean };
  commentInputs: { [key: string]: string };
  onCommentChange: (versionId: string, value: string) => void;
  expanded?: boolean;
}

export function ExternalVersionGallery({
  versions,
  comments,
  onSubmitFeedback,
  submitting,
  commentInputs,
  onCommentChange,
  expanded = false,
}: ExternalVersionGalleryProps) {
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(
    versions[0]?.id || null
  );
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const selectedVersion = versions.find(v => v.id === selectedVersionId);
  const versionComments = comments.filter(c => c.version_id === selectedVersionId);

  // Prepare lightbox images
  const lightboxImages = versions
    .filter(v => v.image_url)
    .map(v => ({
      url: v.image_url!,
      caption: `v${v.version_number}${v.version_notes ? ` - ${v.version_notes}` : ''}`
    }));

  const handleImageClick = (version: Version) => {
    const imageIndex = lightboxImages.findIndex(img => img.url === version.image_url);
    if (imageIndex !== -1) {
      setLightboxIndex(imageIndex);
      setLightboxOpen(true);
    }
  };

  return (
    <div className="space-y-md">
      {/* Version Thumbnails Strip */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {versions.map((version) => (
          <button
            key={version.id}
            onClick={() => setSelectedVersionId(version.id)}
            className={cn(
              "flex-shrink-0 relative rounded-lg overflow-hidden border-2 transition-all",
              selectedVersionId === version.id
                ? "border-primary ring-2 ring-primary/20"
                : "border-border hover:border-muted-foreground"
            )}
          >
            {version.image_url ? (
              <img
                src={version.image_url}
                alt={`v${version.version_number}`}
                className={cn(
                  "object-cover",
                  expanded ? "w-20 h-14" : "w-16 h-12"
                )}
              />
            ) : (
              <div className={cn(
                "bg-muted flex items-center justify-center",
                expanded ? "w-20 h-14" : "w-16 h-12"
              )}>
                <ImageIcon className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
            <div className="absolute bottom-0 inset-x-0 bg-background/90 backdrop-blur-sm text-center">
              <span className="text-[10px] font-mono font-medium">v{version.version_number}</span>
            </div>
            {comments.filter(c => c.version_id === version.id).length > 0 && (
              <div className="absolute top-0.5 right-0.5">
                <div className="w-2 h-2 bg-primary rounded-full" />
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Selected Version Detail */}
      {selectedVersion && (
        <div className={cn(
          "grid gap-lg",
          expanded ? "lg:grid-cols-[1.2fr_1fr]" : "lg:grid-cols-[1fr_1fr]"
        )}>
          {/* Image Section */}
          <div className="space-y-sm">
            {selectedVersion.image_url ? (
              <div 
                className="relative cursor-pointer group rounded-xl overflow-hidden border border-border bg-muted"
                onClick={() => handleImageClick(selectedVersion)}
              >
                <img
                  src={selectedVersion.image_url}
                  alt={`Version ${selectedVersion.version_number}`}
                  className={cn(
                    "w-full h-auto object-contain transition-transform group-hover:scale-[1.02]",
                    expanded ? "max-h-[550px]" : "max-h-[400px]"
                  )}
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <span className="text-white bg-black/50 px-4 py-2 rounded-full text-body-sm font-medium">
                    Click to expand
                  </span>
                </div>
              </div>
            ) : (
              <div className={cn(
                "rounded-xl bg-muted flex items-center justify-center border border-border",
                expanded ? "h-[300px]" : "h-[200px]"
              )}>
                <div className="text-center">
                  <ImageIcon className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground text-body-sm">No image available</p>
                </div>
              </div>
            )}
            
            {/* Version meta */}
            <div className="flex items-center justify-between text-metadata text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(selectedVersion.created_at), "MMM d, h:mm a")}
                <span className="text-muted-foreground/60">
                  ({formatDistanceToNow(new Date(selectedVersion.created_at), { addSuffix: true })})
                </span>
              </div>
              {selectedVersion.asset_link && (
                <a
                  href={selectedVersion.asset_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1"
                >
                  Asset Link <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
            
            {/* Version notes */}
            {selectedVersion.version_notes && (
              <div className="bg-muted/50 rounded-lg p-md border border-border/50">
                <p className="text-body-sm text-foreground">{selectedVersion.version_notes}</p>
              </div>
            )}
          </div>

          {/* Comments Section */}
          <div className="space-y-md">
            {/* Existing Comments */}
            {versionComments.length > 0 && (
              <div>
                <div className="flex items-center gap-xs mb-sm">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <span className="text-body-sm font-medium">
                    Feedback ({versionComments.length})
                  </span>
                </div>
                <ScrollArea className={cn(
                  expanded ? "max-h-[280px]" : "max-h-[200px]"
                )}>
                  <div className="space-y-sm pr-sm">
                    {versionComments.map((comment) => (
                      <div 
                        key={comment.id} 
                        className="flex gap-sm p-sm rounded-lg bg-muted/30 border border-border"
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-metadata bg-primary/10">
                            {comment.reviewer_name?.charAt(0).toUpperCase() || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-sm flex-wrap">
                            <span className="font-medium text-body-sm">
                              {comment.reviewer_name}
                            </span>
                            <span className="text-metadata text-muted-foreground">
                              {format(new Date(comment.created_at), "MMM d, h:mm a")}
                            </span>
                          </div>
                          <p className="text-body-sm text-foreground mt-0.5">
                            {comment.comment_text}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Comment Input */}
            <div className="space-y-sm">
              <div className="flex items-center gap-xs">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <span className="text-body-sm font-medium">Add Feedback</span>
              </div>
              <p className="text-metadata text-muted-foreground">
                Share your thoughts on this version. Your feedback helps improve our campaigns.
              </p>
              <Textarea
                value={commentInputs[selectedVersion.id] || ""}
                onChange={(e) => onCommentChange(selectedVersion.id, e.target.value)}
                placeholder="Share your feedback on this version..."
                className={cn(
                  expanded ? "min-h-[100px]" : "min-h-[80px]"
                )}
              />
              <Button
                onClick={() => onSubmitFeedback(selectedVersion.id, commentInputs[selectedVersion.id] || "")}
                disabled={!commentInputs[selectedVersion.id]?.trim() || submitting[selectedVersion.id]}
                size="sm"
                className="w-full sm:w-auto"
              >
                {submitting[selectedVersion.id] ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Feedback"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      <ImageLightbox
        images={lightboxImages}
        initialIndex={lightboxIndex}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </div>
  );
}
