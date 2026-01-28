import { useState, useMemo } from "react";
import { Plus, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LpSectionCard } from "./LpSectionCard";
import { useLpSections, LpSection } from "@/hooks/useLpSections";
import { useSystemEntities } from "@/hooks/useSystemEntities";
import { DndContext, DragOverlay, useDraggable, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";

import { LP_SECTION_TYPE_FILTER_OPTIONS } from "@/domain/lp-sections";

interface LpSectionLibraryProps {
  selectedSection: LpSection | null;
  onSelectSection: (section: LpSection | null) => void;
  onCreateSection: () => void;
}

function DraggableSectionCard({
  section,
  isSelected,
  onClick,
}: {
  section: LpSection;
  isSelected: boolean;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `library-${section.id}`,
    data: { section, source: "library" },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      <LpSectionCard
        section={section}
        isSelected={isSelected}
        onClick={onClick}
        isDraggable={false}
      />
    </div>
  );
}

export const LpSectionLibrary = ({
  selectedSection,
  onSelectSection,
  onCreateSection,
}: LpSectionLibraryProps) => {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [entityFilter, setEntityFilter] = useState("all");

  const { data: sections = [], isLoading } = useLpSections({ isActive: true });
  const { data: entities = [] } = useSystemEntities();

  const filteredSections = useMemo(() => {
    return sections.filter((section) => {
      const matchesSearch = section.name.toLowerCase().includes(search.toLowerCase());
      const matchesType = typeFilter === "all" || section.section_type === typeFilter;
      const matchesEntity = entityFilter === "all" || section.entity_id === entityFilter;
      return matchesSearch && matchesType && matchesEntity;
    });
  }, [sections, search, typeFilter, entityFilter]);

  // Group sections by type
  const groupedSections = useMemo(() => {
    const groups: Record<string, LpSection[]> = {};
    filteredSections.forEach((section) => {
      const type = section.section_type;
      if (!groups[type]) groups[type] = [];
      groups[type].push(section);
    });
    return groups;
  }, [filteredSections]);

  return (
    <div className="h-full flex flex-col bg-card border-r border-border">
      <div className="p-4 border-b border-border space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">Section Library</h3>
          <Button size="sm" onClick={onCreateSection} className="h-7 text-xs">
            <Plus className="h-3 w-3 mr-1" />
            New
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search sections..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>

        <div className="flex gap-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-8 text-xs flex-1">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              {LP_SECTION_TYPE_FILTER_OPTIONS.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={entityFilter} onValueChange={setEntityFilter}>
            <SelectTrigger className="h-8 text-xs flex-1">
              <SelectValue placeholder="Entity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Entities</SelectItem>
              {entities.map((entity) => (
                <SelectItem key={entity.id} value={entity.id}>
                  {entity.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Loading sections...
            </div>
          ) : Object.keys(groupedSections).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No sections found
            </div>
          ) : (
            Object.entries(groupedSections).map(([type, typeSections]) => (
              <div key={type}>
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  {type}
                </h4>
                <div className="space-y-2">
                  {typeSections.map((section) => (
                    <DraggableSectionCard
                      key={section.id}
                      section={section}
                      isSelected={selectedSection?.id === section.id}
                      onClick={() => onSelectSection(section)}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
