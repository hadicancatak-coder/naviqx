import { useState, useMemo } from "react";
import {
  DndContext,
  DragEndEvent,
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
import { Plus, LayoutTemplate, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LpSectionBlock } from "./LpSectionBlock";
import { LpSectionDrawer } from "./LpSectionDrawer";
import { LpMapHeader } from "./LpMapHeader";
import { LpSectionDialog } from "./LpSectionDialog";
import { LpSectionDetailsDialog } from "./LpSectionDetailsDialog";
import { EmptyState } from "@/components/layout/EmptyState";
import {
  LpMap,
  LpMapSection,
  useAddSectionToMap,
  useRemoveSectionFromMap,
  useReorderMapSections,
} from "@/hooks/useLpMaps";
import { LpSection } from "@/hooks/useLpSections";
import { useLpExternalComments } from "@/hooks/useLpComments";
import { cn } from "@/lib/utils";

interface LpCanvasProps {
  map: LpMap | null;
  onRefresh: () => void;
}

export const LpCanvas = ({ map, onRefresh }: LpCanvasProps) => {
  const [activeSection, setActiveSection] = useState<LpSection | null>(null);
  const [showSectionDrawer, setShowSectionDrawer] = useState(false);
  const [showSectionDialog, setShowSectionDialog] = useState(false);
  const [editingSection, setEditingSection] = useState<LpSection | null>(null);
  
  // Details dialog state
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedMapSection, setSelectedMapSection] = useState<LpMapSection | null>(null);

  const addSection = useAddSectionToMap();
  const removeSection = useRemoveSectionFromMap();
  const reorderSections = useReorderMapSections();

  // Fetch comments for this map
  const { data: allComments = [] } = useLpExternalComments(map?.id || null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const sections = map?.sections || [];

  // Group comments by section_id for efficient lookup
  const commentsBySection = useMemo(() => {
    const grouped: Record<string, typeof allComments> = {};
    allComments.forEach((comment) => {
      const key = comment.section_id || "__map__";
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(comment);
    });
    return grouped;
  }, [allComments]);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const draggedId = active.id as string;
    const mapSection = sections.find((s) => s.id === draggedId);
    if (mapSection?.section) {
      setActiveSection(mapSection.section);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveSection(null);

    if (!over || !map) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId !== overId) {
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

  const handleAddSection = async (section: LpSection) => {
    if (!map) return;
    await addSection.mutateAsync({
      mapId: map.id,
      sectionId: section.id,
      position: sections.length,
    });
    onRefresh();
  };

  const handleRemoveSection = async (mapSectionId: string) => {
    if (!map) return;
    await removeSection.mutateAsync({
      mapSectionId,
      mapId: map.id,
    });
    onRefresh();
  };

  const handleEditSection = (section: LpSection) => {
    setEditingSection(section);
    setShowSectionDialog(true);
  };

  const handleCreateSection = () => {
    setEditingSection(null);
    setShowSectionDialog(true);
    setShowSectionDrawer(false);
  };

  const handleSectionClick = (mapSection: LpMapSection) => {
    setSelectedMapSection(mapSection);
    setShowDetailsDialog(true);
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
          <div className="p-6 max-w-4xl mx-auto">
            {sections.length === 0 ? (
              <div className="border-2 border-dashed border-border rounded-2xl p-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                  <Layers className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-medium text-lg mb-2">Start building your LP</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Add sections to create your landing page structure
                </p>
                <Button onClick={() => setShowSectionDrawer(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Section
                </Button>
              </div>
            ) : (
              <SortableContext
                items={sections.map((s) => s.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {sections.map((mapSection, index) => (
                    <LpSectionBlock
                      key={mapSection.id}
                      mapSection={mapSection}
                      position={index + 1}
                      comments={commentsBySection[mapSection.section_id] || []}
                      onRemove={() => handleRemoveSection(mapSection.id)}
                      onEdit={handleEditSection}
                      onClick={() => handleSectionClick(mapSection)}
                    />
                  ))}

                  {/* Add Section Button */}
                  <button
                    onClick={() => setShowSectionDrawer(true)}
                    className="w-full py-3 border-2 border-dashed border-border rounded-xl text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-card transition-all flex items-center justify-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="text-sm font-medium">Add Section</span>
                  </button>
                </div>
              </SortableContext>
            )}
          </div>
        </ScrollArea>

        <DragOverlay>
          {activeSection && (
            <div className="opacity-90 bg-card rounded-xl border shadow-xl p-4">
              <span className="font-medium">{activeSection.name}</span>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <LpSectionDrawer
        open={showSectionDrawer}
        onOpenChange={setShowSectionDrawer}
        onSelectSection={handleAddSection}
        onCreateSection={handleCreateSection}
      />

      <LpSectionDialog
        open={showSectionDialog}
        onOpenChange={setShowSectionDialog}
        section={editingSection}
      />

      <LpSectionDetailsDialog
        open={showDetailsDialog}
        onOpenChange={setShowDetailsDialog}
        mapSection={selectedMapSection}
        comments={selectedMapSection ? (commentsBySection[selectedMapSection.section_id] || []) : []}
        onEdit={handleEditSection}
        onRemove={() => {
          if (selectedMapSection) {
            handleRemoveSection(selectedMapSection.id);
          }
        }}
      />
    </div>
  );
};
