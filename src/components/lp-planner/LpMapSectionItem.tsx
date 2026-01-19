import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2, Image, Link2, FileText, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { LpMapSection } from "@/hooks/useLpMaps";
import { ScrollArea } from "@/components/ui/scroll-area";

interface LpMapSectionItemProps {
  mapSection: LpMapSection;
  isSelected?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
}

const sectionTypeColors: Record<string, string> = {
  hero: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  features: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  testimonials: "bg-green-500/20 text-green-400 border-green-500/30",
  pricing: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  cta: "bg-red-500/20 text-red-400 border-red-500/30",
  footer: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  custom: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
};

export const LpMapSectionItem = ({
  mapSection,
  isSelected,
  onClick,
  onRemove,
}: LpMapSectionItemProps) => {
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-xl border bg-card overflow-hidden transition-smooth",
        isSelected && "ring-2 ring-primary border-primary",
        isDragging && "opacity-50 shadow-lg"
      )}
    >
      <div
        className={cn(
          "flex items-center gap-3 p-4 cursor-pointer",
          "hover:bg-card-hover transition-colors"
        )}
        onClick={onClick}
      >
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab opacity-50 hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium truncate">{section.name}</span>
            <Badge variant="outline" className={cn("text-xs", typeColor)}>
              {section.section_type}
            </Badge>
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {section.sample_images.length > 0 && (
              <span className="flex items-center gap-1">
                <Image className="h-3 w-3" />
                {section.sample_images.length} images
              </span>
            )}
            {section.website_links.length > 0 && (
              <span className="flex items-center gap-1">
                <Link2 className="h-3 w-3" />
                {section.website_links.length} links
              </span>
            )}
            {section.brief_content && (
              <span className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                Has brief
              </span>
            )}
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
        >
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onRemove?.();
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <Collapsible open={isExpanded}>
        <CollapsibleContent>
          <div className="px-4 pb-4 pt-0 border-t space-y-4">
            {/* Images */}
            {section.sample_images.length > 0 && (
              <div className="pt-4">
                <h4 className="text-xs font-medium text-muted-foreground mb-2">
                  Sample Images
                </h4>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {section.sample_images.map((image) => (
                    <div key={image.id} className="flex-shrink-0">
                      <img
                        src={image.url}
                        alt={image.caption || "Section image"}
                        className="h-20 w-32 object-cover rounded-lg border"
                      />
                      {image.caption && (
                        <p className="text-xs text-muted-foreground mt-1 max-w-[128px] truncate">
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
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {section.brief_content}
                </p>
              </div>
            )}

            {/* Links */}
            {section.website_links.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-2">
                  Reference Links
                </h4>
                <div className="flex flex-wrap gap-2">
                  {section.website_links.map((link) => (
                    <a
                      key={link.id}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      {link.label || link.url}
                    </a>
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
