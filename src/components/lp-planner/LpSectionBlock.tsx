import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2, Image, Link2, FileText, ChevronDown, ExternalLink, Edit2, MessageSquare } from "lucide-react";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { LpMapSection } from "@/hooks/useLpMaps";
import { LpSection } from "@/hooks/useLpSections";
import { LpExternalComment } from "@/hooks/useLpComments";

interface LpSectionBlockProps {
  mapSection: LpMapSection;
  position: number;
  comments?: LpExternalComment[];
  onRemove?: () => void;
  onEdit?: (section: LpSection) => void;
  onClick?: () => void;
}

const sectionTypeColors: Record<string, string> = {
  hero: "border-l-purple-500",
  features: "border-l-blue-500",
  testimonials: "border-l-green-500",
  pricing: "border-l-amber-500",
  cta: "border-l-red-500",
  footer: "border-l-gray-500",
  custom: "border-l-cyan-500",
};

const sectionTypeBadgeColors: Record<string, string> = {
  hero: "bg-purple-500/15 text-purple-400",
  features: "bg-blue-500/15 text-blue-400",
  testimonials: "bg-green-500/15 text-green-400",
  pricing: "bg-amber-500/15 text-amber-400",
  cta: "bg-red-500/15 text-red-400",
  footer: "bg-gray-500/15 text-gray-400",
  custom: "bg-cyan-500/15 text-cyan-400",
};

export const LpSectionBlock = ({
  mapSection,
  position,
  comments = [],
  onRemove,
  onEdit,
  onClick,
}: LpSectionBlockProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: mapSection.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const section = mapSection.section;
  if (!section) return null;

  const typeColor = sectionTypeColors[section.section_type] || sectionTypeColors.custom;
  const badgeColor = sectionTypeBadgeColors[section.section_type] || sectionTypeBadgeColors.custom;
  const firstImage = section.sample_images[0];
  
  const hasContent = section.sample_images.length > 0 || section.website_links.length > 0 || section.brief_content || comments.length > 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group rounded-xl border-l-4 bg-card border border-border overflow-hidden",
        typeColor,
        isDragging && "opacity-50 shadow-xl scale-[1.02]"
      )}
    >
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        {/* Main Row */}
        <div className="flex items-center gap-3 p-3">
          {/* Position Number */}
          <div className="flex items-center justify-center h-7 w-7 rounded-full bg-muted text-xs font-semibold text-muted-foreground flex-shrink-0">
            {position}
          </div>

          {/* Drag Handle - Not clickable for popup */}
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab opacity-40 hover:opacity-100 transition-opacity flex-shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>

          {/* Clickable Content Area */}
          <div 
            className="flex-1 flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={onClick}
          >
            {/* Thumbnail Preview */}
            {firstImage && (
              <div className="flex-shrink-0 h-12 w-20 rounded-lg overflow-hidden border bg-muted">
                <img
                  src={firstImage.url}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
            )}

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm truncate">{section.name}</span>
                <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 border-0", badgeColor)}>
                  {section.section_type}
                </Badge>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                {section.sample_images.length > 0 && (
                  <span className="flex items-center gap-1">
                    <Image className="h-3 w-3" />
                    {section.sample_images.length}
                  </span>
                )}
                {section.website_links.length > 0 && (
                  <span className="flex items-center gap-1">
                    <Link2 className="h-3 w-3" />
                    {section.website_links.length}
                  </span>
                )}
                {section.brief_content && (
                  <span className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    Brief
                  </span>
                )}
                {comments.length > 0 && (
                  <span className="flex items-center gap-1 text-primary">
                    <MessageSquare className="h-3 w-3" />
                    {comments.length}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Actions - Always visible */}
          <div className="flex items-center gap-1">
            {hasContent && (
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                >
                  <ChevronDown className={cn(
                    "h-3.5 w-3.5 transition-transform duration-200",
                    isExpanded && "rotate-180"
                  )} />
                </Button>
              </CollapsibleTrigger>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => onEdit?.(section)}
            >
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={onRemove}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Expanded Details - Animated with Collapsible */}
        <CollapsibleContent className="data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
          <div className="px-4 pb-4 pt-0 border-t border-border space-y-3">
            {/* Description */}
            {section.description && (
              <div className="pt-3">
                <p className="text-sm text-muted-foreground">{section.description}</p>
              </div>
            )}

            {/* Images */}
            {section.sample_images.length > 0 && (
              <div className="pt-2">
                <h4 className="text-xs font-medium text-muted-foreground mb-2">
                  Sample Images ({section.sample_images.length})
                </h4>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {section.sample_images.map((image) => (
                    <div key={image.id} className="flex-shrink-0">
                      <img
                        src={image.url}
                        alt={image.caption || "Section image"}
                        className="h-24 w-40 object-cover rounded-lg border"
                        loading="lazy"
                      />
                      {image.caption && (
                        <p className="text-xs text-muted-foreground mt-1 max-w-[160px] truncate">
                          {image.caption}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Brief */}
            {section.brief_content && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-2">
                  Brief / Instructions
                </h4>
                <p className="text-sm text-foreground whitespace-pre-wrap bg-muted/30 rounded-lg p-3 line-clamp-4">
                  {section.brief_content}
                </p>
              </div>
            )}

            {/* Links */}
            {section.website_links.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-2">
                  Reference Links ({section.website_links.length})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {section.website_links.map((link) => (
                    <a
                      key={link.id}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline bg-primary/5 px-2 py-1 rounded-md"
                    >
                      <ExternalLink className="h-3 w-3" />
                      {link.label || new URL(link.url).hostname}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews/Comments */}
            {comments.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-2">
                  Reviews ({comments.length})
                </h4>
                <div className="space-y-2">
                  {comments.map((comment) => (
                    <div key={comment.id} className="bg-muted/30 rounded-lg p-3 border border-border/50">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="font-medium text-sm">{comment.reviewer_name}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm text-foreground">{comment.comment_text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};
