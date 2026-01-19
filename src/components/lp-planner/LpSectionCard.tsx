import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Image, Link2, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { LpSection } from "@/hooks/useLpSections";

interface LpSectionCardProps {
  section: LpSection;
  isSelected?: boolean;
  onClick?: () => void;
  isDraggable?: boolean;
}

import { sectionTypeCardColors } from "@/domain/lp-sections";

export const LpSectionCard = ({
  section,
  isSelected,
  onClick,
  isDraggable = true,
}: LpSectionCardProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: section.id,
    disabled: !isDraggable,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const typeColor = sectionTypeCardColors[section.section_type] || sectionTypeCardColors.other;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center gap-2 p-3 rounded-lg border bg-card cursor-pointer transition-smooth",
        isSelected && "ring-2 ring-primary border-primary",
        isDragging && "opacity-50 shadow-lg",
        "hover:bg-card-hover"
      )}
      onClick={onClick}
    >
      {isDraggable && (
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab opacity-50 group-hover:opacity-100 transition-opacity"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm truncate">{section.name}</span>
          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", typeColor)}>
            {section.section_type}
          </Badge>
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
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
        </div>
      </div>
    </div>
  );
};
