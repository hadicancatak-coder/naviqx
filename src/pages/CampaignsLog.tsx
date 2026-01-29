import { useState, useEffect, useCallback, useMemo } from "react";
import { DndContext, closestCenter, useSensor, useSensors, PointerSensor, DragOverlay, useDroppable } from "@dnd-kit/core";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { GripVertical, ExternalLink, Search, ChevronDown, Plus, Trash2, Loader2, BookOpen, Upload, LayoutGrid, List, Share2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { EntityCampaignTable } from "@/components/campaigns/EntityCampaignTable";
import { DraggableCampaignCard } from "@/components/campaigns/DraggableCampaignCard";
import { CampaignListView } from "@/components/campaigns/CampaignListView";
import { UtmCampaignDetailDialog } from "@/components/campaigns/UtmCampaignDetailDialog";
import { CreateUtmCampaignDialog } from "@/components/campaigns/CreateUtmCampaignDialog";
import { CampaignBulkActionsBar } from "@/components/campaigns/CampaignBulkActionsBar";
import { CampaignBulkImportDialog } from "@/components/campaigns/CampaignBulkImportDialog";
import { GoogleSheetSyncPanel } from "@/components/campaigns/GoogleSheetSyncPanel";
import { CampaignShareDialog } from "@/components/campaigns/CampaignShareDialog";
import { useUtmCampaigns, useDeleteUtmCampaign } from "@/hooks/useUtmCampaigns";
import { useCampaignEntityTracking } from "@/hooks/useCampaignEntityTracking";
import { useSystemEntities } from "@/hooks/useSystemEntities";
import { useGoogleAuth } from "@/hooks/useGoogleAuth";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { PageContainer, PageHeader, DataCard } from "@/components/layout";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { EntityTrackingStatus } from "@/domain/campaigns";

function TrashZone({ isActive }: { isActive: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: "trash-zone" });
  if (!isActive) return null;
  return (
    <div 
      ref={setNodeRef} 
      className={cn(
        "fixed bottom-0 left-0 right-0 z-overlay h-28 flex items-center justify-center transition-smooth border-t-4",
        isOver ? "bg-destructive border-destructive-foreground" : "bg-destructive/80 border-destructive/50",
        "animate-in slide-in-from-bottom-10"
      )}
    >
      <div className={cn(
        "flex items-center gap-md transition-smooth",
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
  const { loading: authLoading } = useAuth();
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set(['library']));
  const [searchTerm, setSearchTerm] = useState("");
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [createCampaignDialogOpen, setCreateCampaignDialogOpen] = useState(false);
  const [bulkImportDialogOpen, setBulkImportDialogOpen] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<string>("");
  const [libraryEntityFilter, setLibraryEntityFilter] = useState<string>("all");
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [entityShareInfo, setEntityShareInfo] = useState<{
    isPublic: boolean;
    publicToken: string | null;
    clickCount: number;
  }>({ isPublic: false, publicToken: null, clickCount: 0 });

  const { data: entities = [] } = useSystemEntities();
  const { data: campaigns = [], isLoading: isLoadingCampaigns } = useUtmCampaigns();
  const { createTracking, getEntitiesForCampaign, deleteTracking, bulkUpdateStatus } = useCampaignEntityTracking();
  const deleteCampaignMutation = useDeleteUtmCampaign();
  const { accessToken, signIn: googleSignIn } = useGoogleAuth();
  
  // Fetch entity share info when entity changes
  const fetchEntityShareInfo = useCallback(async () => {
    if (!selectedEntity) return;
    
    // Get the most recent active token for this entity
    const { data } = await supabase
      .from("campaign_external_access")
      .select("access_token, is_active, click_count")
      .eq("entity", selectedEntity)
      .is("campaign_id", null)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (data) {
      setEntityShareInfo({
        isPublic: data.is_active ?? false,
        publicToken: data.access_token,
        clickCount: data.click_count ?? 0,
      });
    } else {
      setEntityShareInfo({ isPublic: false, publicToken: null, clickCount: 0 });
    }
  }, [selectedEntity]);

  useEffect(() => {
    fetchEntityShareInfo();
  }, [fetchEntityShareInfo]);
  
  useEffect(() => {
    if (entities.length > 0 && !selectedEntity) setSelectedEntity(entities[0].name);
  }, [entities, selectedEntity]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleDragStart = (event: any) => setActiveDragId(String(event.active.id));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : '';
          toast.error(errorMessage.includes("duplicate") ? "Campaign already exists in this entity" : "Failed to move campaign");
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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '';
      toast.error(errorMessage.includes("duplicate") ? "Campaign already exists in this entity" : "Failed to add campaign");
    }
  };

  // Memoize transformedCampaigns to prevent recalculation on every render
  const transformedCampaigns = useMemo(() => campaigns.map((c) => ({ 
    id: c.id, 
    name: c.name, 
    campaign_type: c.campaign_type, 
    description: c.description, 
    landing_page: c.landing_page, 
    is_active: c.is_active, 
    notes: null 
  })), [campaigns]);

  // Memoize filtered campaigns to prevent recalculation
  const filteredCampaigns = useMemo(() => transformedCampaigns.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    if (libraryEntityFilter === "all") return true;
    return getEntitiesForCampaign(c.id).some(t => t.entity === libraryEntityFilter);
  }), [transformedCampaigns, searchTerm, libraryEntityFilter, getEntitiesForCampaign]);

  const handleBulkAssignMultiple = async (entityNames: string[], status: EntityTrackingStatus) => {
    if (entityNames.length === 0 || selectedCampaigns.length === 0) return;
    try {
      // Create tracking records for each campaign + entity combination
      const operations = selectedCampaigns.flatMap(campaignId =>
        entityNames.map(entity => 
          createTracking.mutateAsync({ campaign_id: campaignId, entity, status })
        )
      );
      await Promise.all(operations);
      toast.success(`${selectedCampaigns.length} campaigns assigned to ${entityNames.length} entities as ${status}`);
      setSelectedCampaigns([]);
    } catch {
      toast.error("Failed to assign some campaigns (they may already exist in those entities)");
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

  const handleBulkStatusChange = async (status: EntityTrackingStatus) => {
    // Get all tracking records for selected campaigns
    const trackingIds: string[] = [];
    selectedCampaigns.forEach(campaignId => {
      const entities = getEntitiesForCampaign(campaignId);
      entities.forEach(e => trackingIds.push(e.id));
    });

    if (trackingIds.length === 0) {
      toast.error("Selected campaigns are not assigned to any entities");
      return;
    }

    try {
      await bulkUpdateStatus.mutateAsync({ trackingIds, status });
      setSelectedCampaigns([]);
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleSelectCampaign = (id: string) => {
    setSelectedCampaigns(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // Wait for auth to resolve first
  if (authLoading) {
    return (
      <PageContainer size="wide">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </PageContainer>
    );
  }

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
                onClick={() => setShareDialogOpen(true)} 
                variant="outline"
                disabled={!selectedEntity}
              >
                <Share2 />
                Share
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
        <div className="liquid-glass rounded-xl border border-border/50">
          <Collapsible 
            open={expandedCampaigns.has('library')} 
            onOpenChange={(open) => { 
              const n = new Set(expandedCampaigns); 
              open ? n.add('library') : n.delete('library'); 
              setExpandedCampaigns(n); 
            }}
          >
            <div className="w-full flex items-center justify-between p-md">
              <CollapsibleTrigger className="flex items-center gap-sm cursor-pointer hover:bg-card-hover transition-smooth rounded-lg px-sm py-sm flex-1">
                <GripVertical className="h-5 w-5 text-muted-foreground" />
                <h3 className="text-heading-sm font-medium text-foreground">Campaign Library</h3>
                <Badge variant="secondary" className="ml-sm">{filteredCampaigns.length}</Badge>
                <ChevronDown className={cn(
                  "h-5 w-5 text-muted-foreground transition-smooth ml-auto",
                  expandedCampaigns.has('library') && "rotate-180"
                )} />
              </CollapsibleTrigger>
              <div className="flex items-center gap-sm">
                <GoogleSheetSyncPanel accessToken={accessToken} onRequestAuth={googleSignIn} />
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
                    className="pl-10 bg-card/50" 
                  />
                </div>
                <Select value={libraryEntityFilter} onValueChange={setLibraryEntityFilter}>
                  <SelectTrigger className="w-[180px] bg-card/50">
                    <SelectValue placeholder="Filter by entity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Entities</SelectItem>
                    {entities.map((e) => (
                      <SelectItem key={e.name} value={e.name}>{e.emoji} {e.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {/* View Toggle */}
                <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as 'grid' | 'list')}>
                  <ToggleGroupItem value="grid" aria-label="Grid view" className="px-3">
                    <LayoutGrid className="size-4" />
                  </ToggleGroupItem>
                  <ToggleGroupItem value="list" aria-label="List view" className="px-3">
                    <List className="size-4" />
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
              
              {viewMode === 'grid' ? (
                <ScrollArea className="h-[400px]">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-sm">
                    {filteredCampaigns.map((c) => (
                      <div key={c.id} className="relative">
                        <Checkbox 
                          checked={selectedCampaigns.includes(c.id)} 
                          onCheckedChange={() => handleSelectCampaign(c.id)} 
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
              ) : (
                <ScrollArea className="h-[400px]">
                  <CampaignListView 
                    campaigns={filteredCampaigns}
                    selectedCampaigns={selectedCampaigns}
                    onSelectCampaign={handleSelectCampaign}
                    onCampaignClick={setSelectedCampaignId}
                  />
                </ScrollArea>
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>
        
        <TrashZone isActive={activeDragId !== null} />

        {/* Bulk Actions Bar */}
        <CampaignBulkActionsBar
          selectedCount={selectedCampaigns.length}
          onClearSelection={() => setSelectedCampaigns([])}
          onAssignToEntities={handleBulkAssignMultiple}
          onDelete={handleBulkDelete}
          onBulkStatusChange={handleBulkStatusChange}
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
      
      <CampaignShareDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        entity={selectedEntity}
        isPublic={entityShareInfo.isPublic}
        publicToken={entityShareInfo.publicToken}
        clickCount={entityShareInfo.clickCount}
        onRefresh={fetchEntityShareInfo}
      />
    </DndContext>
  );
}
