import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Image, Link2, FileText, ExternalLink, MessageSquare, Edit2, Trash2, ZoomIn } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import { LpMapSection } from "@/hooks/useLpMaps";
import { LpSection } from "@/hooks/useLpSections";
import { LpExternalComment } from "@/hooks/useLpComments";

interface LpSectionDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mapSection: LpMapSection | null;
  comments?: LpExternalComment[];
  onEdit?: (section: LpSection) => void;
  onRemove?: () => void;
}

const sectionTypeBadgeColors: Record<string, string> = {
  hero: "bg-purple-500/15 text-purple-400",
  features: "bg-blue-500/15 text-blue-400",
  testimonials: "bg-green-500/15 text-green-400",
  pricing: "bg-amber-500/15 text-amber-400",
  cta: "bg-red-500/15 text-red-400",
  footer: "bg-gray-500/15 text-gray-400",
  custom: "bg-cyan-500/15 text-cyan-400",
};

export const LpSectionDetailsDialog = ({
  open,
  onOpenChange,
  mapSection,
  comments = [],
  onEdit,
  onRemove,
}: LpSectionDetailsDialogProps) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  
  const section = mapSection?.section;

  if (!section) return null;

  const badgeColor = sectionTypeBadgeColors[section.section_type] || sectionTypeBadgeColors.custom;

  const handleImageClick = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-xl p-0 flex flex-col">
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <SheetTitle className="text-lg font-semibold truncate">
                    {section.name}
                  </SheetTitle>
                  <Badge variant="outline" className={cn("text-xs border-0", badgeColor)}>
                    {section.section_type}
                  </Badge>
                </div>
                {section.entity && (
                  <p className="text-sm text-muted-foreground">
                    Entity: {section.entity.name}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    onEdit?.(section);
                    onOpenChange(false);
                  }}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => {
                    onRemove?.();
                    onOpenChange(false);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </SheetHeader>

          <ScrollArea className="flex-1">
            <div className="px-6 py-4 space-y-6">
              {/* Description */}
              {section.description && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">
                    Description
                  </h3>
                  <p className="text-sm text-foreground">{section.description}</p>
                </div>
              )}

              {/* Sample Images - Clickable */}
              {section.sample_images.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                    <Image className="h-4 w-4" />
                    Sample Images ({section.sample_images.length})
                    <span className="text-xs text-muted-foreground/70 ml-1">(click to view)</span>
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {section.sample_images.map((image, index) => (
                      <button
                        key={image.id}
                        className="group relative text-left rounded-lg overflow-hidden border border-border hover:border-primary/50 transition-colors"
                        onClick={() => handleImageClick(index)}
                      >
                        <img
                          src={image.url}
                          alt={image.caption || "Section image"}
                          className="w-full h-32 object-cover"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                          <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        {image.caption && (
                          <p className="text-xs text-muted-foreground p-2 line-clamp-2 bg-card">
                            {image.caption}
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Brief Content */}
              {section.brief_content && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Brief / Instructions
                  </h3>
                  <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
                    <p className="text-sm text-foreground whitespace-pre-wrap">
                      {section.brief_content}
                    </p>
                  </div>
                </div>
              )}

              {/* Reference Links */}
              {section.website_links.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                    <Link2 className="h-4 w-4" />
                    Reference Links ({section.website_links.length})
                  </h3>
                  <div className="space-y-2">
                    {section.website_links.map((link) => (
                      <a
                        key={link.id}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors group"
                      >
                        <ExternalLink className="h-4 w-4 text-primary flex-shrink-0" />
                        <span className="text-sm text-foreground truncate flex-1">
                          {link.label || link.url}
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Reviews/Comments Section */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Reviews ({comments.length})
                </h3>
                {comments.length > 0 ? (
                  <div className="space-y-3">
                    {comments.map((comment) => (
                      <div
                        key={comment.id}
                        className="bg-muted/30 rounded-lg p-4 border border-border/50"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center">
                            <span className="text-xs font-medium text-primary">
                              {comment.reviewer_name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="font-medium text-sm">{comment.reviewer_name}</span>
                            <span className="text-xs text-muted-foreground ml-2">
                              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-foreground pl-9">{comment.comment_text}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground bg-muted/20 rounded-lg border border-dashed border-border">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No reviews yet</p>
                    <p className="text-xs mt-1">Share the public link to collect reviews</p>
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Image Lightbox */}
      <ImageLightbox
        images={section.sample_images.map((img) => ({
          url: img.url,
          caption: img.caption,
        }))}
        initialIndex={lightboxIndex}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </>
  );
};
