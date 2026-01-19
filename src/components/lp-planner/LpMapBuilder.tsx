import { useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Plus, LayoutTemplate } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LpMapSectionItem } from "./LpMapSectionItem";
import { LpSectionCard } from "./LpSectionCard";
import { LpMapHeader } from "./LpMapHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import {
  LpMap,
  LpMapSection,
  useAddSectionToMap,
  useRemoveSectionFromMap,
  useReorderMapSections,
} from "@/hooks/useLpMaps";
import { LpSection } from "@/hooks/useLpSections";

interface LpMapBuilderProps {
  map: LpMap | null;
  onSelectSection: (section: LpSection | null, mapSection?: LpMapSection) => void;
  selectedMapSectionId?: string | null;
  onRefresh: () => void;
}

export const LpMapBuilder = ({
  map,
  onSelectSection,
  selectedMapSectionId,
  onRefresh,
}: LpMapBuilderProps) => {
  const [activeSection, setActiveSection] = useState<LpSection | null>(null);

  const addSection = useAddSectionToMap();
  const removeSection = useRemoveSectionFromMap();
  const reorderSections = useReorderMapSections();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const sections = map?.sections || [];

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const draggedId = active.id as string;

    // Check if dragging from library
    if (draggedId.startsWith("library-")) {
      const sectionData = active.data.current?.section;
      if (sectionData) {
        setActiveSection(sectionData);
      }
    } else {
      // Dragging within map
      const mapSection = sections.find((s) => s.id === draggedId);
      if (mapSection?.section) {
        setActiveSection(mapSection.section);
      }
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveSection(null);

    if (!over || !map) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Adding from library
    if (activeId.startsWith("library-")) {
      const sectionData = active.data.current?.section as LpSection;
      if (sectionData) {
        // Find position to insert
        let position = sections.length;
        if (overId !== "map-drop-zone") {
          const overIndex = sections.findIndex((s) => s.id === overId);
          if (overIndex !== -1) {
            position = overIndex;
          }
        }

        await addSection.mutateAsync({
          mapId: map.id,
          sectionId: sectionData.id,
          position,
        });
        onRefresh();
      }
      return;
    }

    // Reordering within map
    if (activeId !== overId && !overId.startsWith("library-")) {
      const oldIndex = sections.findIndex((s) => s.id === activeId);
      const newIndex = sections.findIndex((s) => s.id === overId);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove(sections, oldIndex, newIndex);
        const sectionOrders = newOrder.map((s, i) => ({
          id: s.id,
          position: i,
        }));

        await reorderSections.mutateAsync({
          mapId: map.id,
          sectionOrders,
        });
        onRefresh();
      }
    }
  };

  const handleRemoveSection = async (mapSectionId: string) => {
    if (!map) return;
    await removeSection.mutateAsync({
      mapSectionId,
      mapId: map.id,
    });
    onRefresh();
  };

  if (!map) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <EmptyState
          icon={LayoutTemplate}
          title="No map selected"
          description="Select a map from the list or create a new one to start building"
        />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      <LpMapHeader map={map} onRefresh={onRefresh} />

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <ScrollArea className="flex-1">
          <div className="p-6">
            {sections.length === 0 ? (
              <div
                id="map-drop-zone"
                className="border-2 border-dashed border-border rounded-xl p-12 text-center"
              >
                <LayoutTemplate className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium mb-2">Start building your LP</h3>
                <p className="text-sm text-muted-foreground">
                  Drag sections from the library to add them here
                </p>
              </div>
            ) : (
              <SortableContext
                items={sections.map((s) => s.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {sections.map((mapSection) => (
                    <LpMapSectionItem
                      key={mapSection.id}
                      mapSection={mapSection}
                      isSelected={selectedMapSectionId === mapSection.id}
                      onClick={() =>
                        onSelectSection(mapSection.section || null, mapSection)
                      }
                      onRemove={() => handleRemoveSection(mapSection.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            )}
          </div>
        </ScrollArea>

        <DragOverlay>
          {activeSection && (
            <div className="opacity-80">
              <LpSectionCard section={activeSection} isDraggable={false} />
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
};
