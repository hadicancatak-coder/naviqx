import { useState, useCallback } from "react";
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { useQueryClient } from "@tanstack/react-query";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LpSectionLibrary,
  LpSectionDialog,
  LpSectionDetails,
  LpMapList,
  LpMapBuilder,
} from "@/components/lp-planner";
import { LpSection } from "@/hooks/useLpSections";
import { useLpMapWithSections, useAddSectionToMap, LpMapSection } from "@/hooks/useLpMaps";

const LpPlanner = () => {
  const [activeTab, setActiveTab] = useState<"maps" | "sections">("maps");
  const [selectedMapId, setSelectedMapId] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<LpSection | null>(null);
  const [selectedMapSectionId, setSelectedMapSectionId] = useState<string | null>(null);
  const [showSectionDialog, setShowSectionDialog] = useState(false);
  const [editingSection, setEditingSection] = useState<LpSection | null>(null);

  const queryClient = useQueryClient();
  const { data: selectedMap, refetch: refetchMap } = useLpMapWithSections(selectedMapId);
  const addSectionToMap = useAddSectionToMap();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const handleSelectMap = useCallback((mapId: string | null) => {
    setSelectedMapId(mapId);
    setSelectedSection(null);
    setSelectedMapSectionId(null);
  }, []);

  const handleSelectSection = useCallback((section: LpSection | null, mapSection?: LpMapSection) => {
    setSelectedSection(section);
    setSelectedMapSectionId(mapSection?.id || null);
  }, []);

  const handleCreateSection = useCallback(() => {
    setEditingSection(null);
    setShowSectionDialog(true);
  }, []);

  const handleEditSection = useCallback(() => {
    if (selectedSection) {
      setEditingSection(selectedSection);
      setShowSectionDialog(true);
    }
  }, [selectedSection]);

  const handleRefreshMap = useCallback(() => {
    refetchMap();
    queryClient.invalidateQueries({ queryKey: ["lp-maps"] });
  }, [refetchMap, queryClient]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || !selectedMapId) return;

    const activeId = active.id as string;

    // Only handle library -> map drops at this level
    if (activeId.startsWith("library-")) {
      const sectionData = active.data.current?.section as LpSection;
      if (sectionData) {
        const currentSections = selectedMap?.sections || [];
        await addSectionToMap.mutateAsync({
          mapId: selectedMapId,
          sectionId: sectionData.id,
          position: currentSections.length,
        });
        handleRefreshMap();
      }
    }
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="h-[calc(100vh-64px)] flex flex-col">
        <ResizablePanelGroup direction="horizontal" className="flex-1">
          {/* Left Panel - Maps List or Section Library */}
          <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "maps" | "sections")} className="h-full flex flex-col">
              <div className="border-b border-border px-2">
                <TabsList className="w-full justify-start h-10 bg-transparent p-0">
                  <TabsTrigger value="maps" className="text-xs">Maps</TabsTrigger>
                  <TabsTrigger value="sections" className="text-xs">Sections</TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="maps" className="flex-1 m-0">
                <LpMapList
                  selectedMapId={selectedMapId}
                  onSelectMap={handleSelectMap}
                />
              </TabsContent>
              <TabsContent value="sections" className="flex-1 m-0">
                <LpSectionLibrary
                  selectedSection={selectedSection}
                  onSelectSection={handleSelectSection}
                  onCreateSection={handleCreateSection}
                />
              </TabsContent>
            </Tabs>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Middle Panel - Map Builder */}
          <ResizablePanel defaultSize={55} minSize={40}>
            <LpMapBuilder
              map={selectedMap || null}
              onSelectSection={handleSelectSection}
              selectedMapSectionId={selectedMapSectionId}
              onRefresh={handleRefreshMap}
            />
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Right Panel - Section Details */}
          <ResizablePanel defaultSize={25} minSize={20} maxSize={35}>
            <LpSectionDetails
              section={selectedSection}
              onEdit={handleEditSection}
            />
          </ResizablePanel>
        </ResizablePanelGroup>

        <LpSectionDialog
          open={showSectionDialog}
          onOpenChange={setShowSectionDialog}
          section={editingSection}
        />
      </div>
    </DndContext>
  );
};

export default LpPlanner;
