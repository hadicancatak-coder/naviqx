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

const sectionTypeColors: Record<string, string> = {
  hero: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  features: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  testimonials: "bg-green-500/20 text-green-400 border-green-500/30",
  pricing: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  cta: "bg-red-500/20 text-red-400 border-red-500/30",
  footer: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  custom: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
};

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

  const typeColor = sectionTypeColors[section.section_type] || sectionTypeColors.custom;

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
