import { useState, useEffect } from "react";
import { DndContext, closestCenter, useSensor, useSensors, PointerSensor, DragOverlay, useDroppable } from "@dnd-kit/core";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { GripVertical, ExternalLink, Search, ChevronDown, Plus, Trash2, Loader2, BookOpen, Upload } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { EntityCampaignTable } from "@/components/campaigns/EntityCampaignTable";
import { DraggableCampaignCard } from "@/components/campaigns/DraggableCampaignCard";
import { UtmCampaignDetailDialog } from "@/components/campaigns/UtmCampaignDetailDialog";
import { CreateUtmCampaignDialog } from "@/components/campaigns/CreateUtmCampaignDialog";
import { CampaignBulkActionsBar } from "@/components/campaigns/CampaignBulkActionsBar";
import { CampaignBulkImportDialog } from "@/components/campaigns/CampaignBulkImportDialog";
import { useUtmCampaigns, useDeleteUtmCampaign } from "@/hooks/useUtmCampaigns";
import { useCampaignEntityTracking } from "@/hooks/useCampaignEntityTracking";
import { useSystemEntities } from "@/hooks/useSystemEntities";
import { useExternalAccess } from "@/hooks/useExternalAccess";
import { PageContainer, PageHeader, DataCard } from "@/components/layout";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function TrashZone({ isActive }: { isActive: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: "trash-zone" });
  if (!isActive) return null;
  return (
    <div 
      ref={setNodeRef} 
      className={cn(
        "fixed bottom-0 left-0 right-0 z-overlay h-28 flex items-center justify-center transition-all duration-300 border-t-4",
        isOver ? "bg-destructive border-destructive-foreground" : "bg-destructive/80 border-destructive/50",
        "animate-in slide-in-from-bottom-10"
      )}
    >
      <div className={cn(
        "flex items-center gap-md transition-transform duration-200",
        isOver && "scale-110"
      )}>
        <Trash2 className="h-10 w-10 text-destructive-foreground" />
        <span className="text-heading-lg font-semibold text-destructive-foreground">
          {isOver ? "Release to remove" : "Drag here to remove"}
        </span>
      </div>
    </div>
  );
}

export default function CampaignsLog() {
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set(['library']));
  const [searchTerm, setSearchTerm] = useState("");
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [createCampaignDialogOpen, setCreateCampaignDialogOpen] = useState(false);
  const [bulkImportDialogOpen, setBulkImportDialogOpen] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<string>("");
  const [libraryEntityFilter, setLibraryEntityFilter] = useState<string>("all");
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  const [generatingLink, setGeneratingLink] = useState(false);

  const { data: entities = [] } = useSystemEntities();
  const { data: campaigns = [], isLoading: isLoadingCampaigns } = useUtmCampaigns();
  const { createTracking, getEntitiesForCampaign, deleteTracking } = useCampaignEntityTracking();
  const { generateLink } = useExternalAccess();
  const deleteCampaignMutation = useDeleteUtmCampaign();
  
  useEffect(() => {
    if (entities.length > 0 && !selectedEntity) setSelectedEntity(entities[0].name);
  }, [entities, selectedEntity]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const handleDragStart = (event: any) => setActiveDragId(String(event.active.id));

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    setActiveDragId(null);
    if (!over) return;

    const activeId = String(active.id);
    const dropTargetId = String(over.id);
    
    if (activeId.startsWith('entity-campaign-')) {
      const trackingId = active.data.current?.trackingId;
      const campaignId = active.data.current?.campaignId;
      
      if (!trackingId || !campaignId) return;
      
      if (dropTargetId === "trash-zone") {
        try {
          await deleteTracking.mutateAsync(trackingId);
          toast.success("Campaign removed from entity");
        } catch {
          toast.error("Failed to remove campaign");
        }
        return;
      }
      
      if (dropTargetId.startsWith('entity-')) {
        const targetEntity = dropTargetId.replace('entity-', '');
        try {
          await deleteTracking.mutateAsync(trackingId);
          await createTracking.mutateAsync({ campaign_id: campaignId, entity: targetEntity, status: "Draft" });
          toast.success(`Campaign moved to ${targetEntity}`);
        } catch (error: any) {
          toast.error(error.message?.includes("duplicate") ? "Campaign already exists in this entity" : "Failed to move campaign");
        }
        return;
      }
    }
    
    const campaignId = activeId;
    
    if (dropTargetId === "trash-zone") {
      const entitiesToRemove = getEntitiesForCampaign(campaignId);
      try {
        await Promise.all(entitiesToRemove.map(t => deleteTracking.mutateAsync(t.id)));
        toast.success("Campaign removed from all entities");
      } catch {
        toast.error("Failed to remove campaign");
      }
      return;
    }
    
    if (!dropTargetId.startsWith('entity-')) return;
    const targetEntity = dropTargetId.replace('entity-', '');

    try {
      await createTracking.mutateAsync({ campaign_id: campaignId, entity: targetEntity, status: "Draft" });
      toast.success(`Campaign added to ${targetEntity}`);
    } catch (error: any) {
      toast.error(error.message?.includes("duplicate") ? "Campaign already exists in this entity" : "Failed to add campaign");
    }
  };

  const transformedCampaigns = campaigns.map((c) => ({ 
    id: c.id, 
    name: c.name, 
    campaign_type: c.campaign_type, 
    description: c.description, 
    landing_page: c.landing_page, 
    is_active: c.is_active, 
    notes: null 
  }));

  const filteredCampaigns = transformedCampaigns.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    if (libraryEntityFilter === "all") return true;
    return getEntitiesForCampaign(c.id).some(t => t.entity === libraryEntityFilter);
  });

  const handleBulkAssign = async (entityName: string) => {
    if (!entityName || selectedCampaigns.length === 0) return;
    try {
      await Promise.all(selectedCampaigns.map(id => 
        createTracking.mutateAsync({ campaign_id: id, entity: entityName, status: "Draft" })
      ));
      toast.success(`${selectedCampaigns.length} campaigns added to ${entityName}`);
      setSelectedCampaigns([]);
    } catch {
      toast.error("Failed to assign campaigns");
    }
  };

  const handleBulkDelete = async () => {
    try {
      await Promise.all(selectedCampaigns.map(id => deleteCampaignMutation.mutateAsync(id)));
      toast.success(`${selectedCampaigns.length} campaigns deleted`);
      setSelectedCampaigns([]);
    } catch {
      toast.error("Failed to delete campaigns");
    }
  };

  const handleGenerateReviewLink = async () => {
    if (!selectedEntity) {
      toast.error("Please select an entity first");
      return;
    }

    setGeneratingLink(true);
    try {
      const result = await generateLink.mutateAsync({
        entity: selectedEntity,
        reviewerName: "External Reviewer",
        reviewerEmail: "reviewer@cfi.trade",
        expiresAt: undefined,
      });

      await navigator.clipboard.writeText(result.url);
      toast.success("Review link generated and copied to clipboard!");
    } catch (error: any) {
      toast.error(error.message || "Failed to generate review link");
    } finally {
      setGeneratingLink(false);
    }
  };

  if (isLoadingCampaigns) {
    return (
      <PageContainer size="wide">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-muted-foreground">Loading campaigns...</div>
        </div>
      </PageContainer>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <PageContainer size="wide" className="pb-0">
        <PageHeader
          icon={BookOpen}
          title="Campaign Log"
          description="Track and manage campaign assignments across entities"
          actions={
            <div className="flex items-center gap-sm">
              <Select value={selectedEntity} onValueChange={setSelectedEntity}>
                <SelectTrigger className="w-[200px] bg-card">
                  <SelectValue placeholder="Select entity" />
                </SelectTrigger>
                <SelectContent>
                  {entities.map((e) => (
                    <SelectItem key={e.name} value={e.name}>{e.emoji} {e.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                onClick={handleGenerateReviewLink} 
                variant="outline"
                disabled={!selectedEntity || generatingLink}
              >
                {generatingLink ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <ExternalLink />
                    Review Link
                  </>
                )}
              </Button>
            </div>
          }
        />

        {/* Main Campaign Table */}
        {selectedEntity && (
          <DataCard noPadding className="overflow-hidden">
            <EntityCampaignTable entity={selectedEntity} campaigns={transformedCampaigns} />
          </DataCard>
        )}
        
        {/* Campaign Library */}
        <div className="border-t border-border bg-card rounded-xl shadow-soft">
          <Collapsible 
            open={expandedCampaigns.has('library')} 
            onOpenChange={(open) => { 
              const n = new Set(expandedCampaigns); 
              open ? n.add('library') : n.delete('library'); 
              setExpandedCampaigns(n); 
            }}
          >
            <div className="w-full flex items-center justify-between p-md">
              <CollapsibleTrigger className="flex items-center gap-sm cursor-pointer hover:bg-accent/50 transition-all duration-200 rounded-lg px-sm py-sm flex-1">
                <GripVertical className="h-5 w-5 text-muted-foreground" />
                <h3 className="text-heading-sm font-medium text-foreground">Campaign Library</h3>
                <Badge variant="secondary" className="ml-sm">{filteredCampaigns.length}</Badge>
                <ChevronDown className={cn(
                  "h-5 w-5 text-muted-foreground transition-transform duration-300 ml-auto",
                  expandedCampaigns.has('library') && "rotate-180"
                )} />
              </CollapsibleTrigger>
              <div className="flex items-center gap-sm">
                <Button onClick={() => setBulkImportDialogOpen(true)} variant="outline" size="sm">
                  <Upload />
                  Import
                </Button>
                <Button onClick={() => setCreateCampaignDialogOpen(true)} size="sm">
                  <Plus />
                  Add Campaign
                </Button>
              </div>
            </div>
            
            <CollapsibleContent className="px-md pb-md space-y-md">
              <div className="flex items-center gap-sm">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                  <Input 
                    placeholder="Search campaigns..." 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                    className="pl-10 bg-background" 
                  />
                </div>
                <Select value={libraryEntityFilter} onValueChange={setLibraryEntityFilter}>
                  <SelectTrigger className="w-[180px] bg-background">
                    <SelectValue placeholder="Filter by entity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Entities</SelectItem>
                    {entities.map((e) => (
                      <SelectItem key={e.name} value={e.name}>{e.emoji} {e.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <ScrollArea className="h-[400px]">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-sm">
                  {filteredCampaigns.map((c) => (
                    <div key={c.id} className="relative">
                      <Checkbox 
                        checked={selectedCampaigns.includes(c.id)} 
                        onCheckedChange={() => setSelectedCampaigns(p => p.includes(c.id) ? p.filter(i => i !== c.id) : [...p, c.id])} 
                        className="absolute top-sm right-sm z-10 bg-background/80 backdrop-blur-sm" 
                      />
                      <DraggableCampaignCard 
                        campaign={c} 
                        isDragging={activeDragId === c.id} 
                        onClick={() => setSelectedCampaignId(c.id)} 
                      />
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CollapsibleContent>
          </Collapsible>
        </div>
        
        <TrashZone isActive={activeDragId !== null} />

        {/* Bulk Actions Bar */}
        <CampaignBulkActionsBar
          selectedCount={selectedCampaigns.length}
          onClearSelection={() => setSelectedCampaigns([])}
          onAssignToEntity={handleBulkAssign}
          onDelete={handleBulkDelete}
        />
      </PageContainer>

      <DragOverlay>
        {activeDragId && (() => {
          if (activeDragId.startsWith('entity-campaign-')) {
            const campaignId = campaigns.find(c => activeDragId.includes(c.id))?.id;
            const campaign = transformedCampaigns.find((c) => c.id === campaignId);
            return campaign ? <DraggableCampaignCard campaign={campaign} isDragging /> : null;
          }
          const campaign = transformedCampaigns.find((c) => c.id === activeDragId);
          return campaign ? <DraggableCampaignCard campaign={campaign} isDragging /> : null;
        })()}
      </DragOverlay>

      <CreateUtmCampaignDialog open={createCampaignDialogOpen} onOpenChange={setCreateCampaignDialogOpen} />
      <CampaignBulkImportDialog open={bulkImportDialogOpen} onOpenChange={setBulkImportDialogOpen} />
      {selectedCampaignId && <UtmCampaignDetailDialog open={!!selectedCampaignId} onOpenChange={(o) => !o && setSelectedCampaignId(null)} campaignId={selectedCampaignId} />}
    </DndContext>
  );
}