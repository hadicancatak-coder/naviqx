import { useState, useRef, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Upload, X, FolderOpen, Target, ChevronDown, ChevronUp, MapPin, Layers } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useMediaLocations, MediaLocation, LocationWithDetails, getLocationCategory } from "@/hooks/useMediaLocations";
import { usePlannedCampaigns } from "@/hooks/usePlannedCampaigns";
import { useLocationCampaigns } from "@/hooks/useLocationCampaigns";
import { LocationMap, LocationMapRef } from "@/components/location/LocationMap";
import { LocationSearch } from "@/components/location/LocationSearch";
import { FloatingFilterBox } from "@/components/location/FloatingFilterBox";
import { LocationDetailPopup } from "@/components/location/LocationDetailPopup";
import { LocationFormDialog } from "@/components/location/LocationFormDialog";
import { CampaignPlannerDialog } from "@/components/location/CampaignPlannerDialog";
import { BulkLocationUploadDialog } from "@/components/location/BulkLocationUploadDialog";
import { CampaignsListDialog } from "@/components/location/CampaignsListDialog";
import { VendorsDialog } from "@/components/location/VendorsDialog";
import { CampaignDetailDialog } from "@/components/location/CampaignDetailDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export default function LocationIntelligence() {
  const { userRole } = useAuth();
  const isAdmin = userRole === "admin";
  const { locations, isLoading, deleteLocation, getLocationWithDetails } = useMediaLocations();
  const { campaigns } = usePlannedCampaigns();
  const { campaignLocations, getLocationsByCampaign } = useLocationCampaigns();
  
  const [selectedLocations, setSelectedLocations] = useState<MediaLocation[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<LocationWithDetails | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<LocationWithDetails | null>(null);
  const [plannerOpen, setPlannerOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  
  const [campaignsListOpen, setCampaignsListOpen] = useState(false);
  const [vendorsOpen, setVendorsOpen] = useState(false);
  const [selectionMode, setSelectionMode] = useState<'normal' | 'campaign-select'>('normal');
  const [clickedCoordinates, setClickedCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const mapRef = useRef<LocationMapRef>(null);
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [selectedCampaignForDetail, setSelectedCampaignForDetail] = useState<string | null>(null);

  const [filters, setFilters] = useState<{
    cities: string[];
    agencies: string[];
    categories: string[];
    campaignId?: string;
  }>({
    cities: [],
    agencies: [],
    categories: [],
    campaignId: undefined,
  });

  const cities = Array.from(new Set(locations.map(l => l.city))).sort();
  const agencies = Array.from(new Set(locations.map(l => l.agency).filter(Boolean))).sort() as string[];

  const campaignLocationIds = filters.campaignId 
    ? getLocationsByCampaign(filters.campaignId).map(cl => cl.location_id)
    : [];

  const filteredLocations = useMemo(() => {
    return locations.filter((loc) => {
      if (filters.cities.length > 0 && !filters.cities.includes(loc.city)) return false;
      if (filters.agencies.length > 0 && !filters.agencies.includes(loc.agency || "")) return false;
      if (filters.categories.length > 0) {
        const category = getLocationCategory(loc.type);
        if (!category || !filters.categories.includes(category)) return false;
      }
      if (filters.campaignId && !campaignLocationIds.includes(loc.id)) return false;
      return true;
    });
  }, [locations, filters, campaignLocationIds]);

  const handleLocationClick = (location: MediaLocation) => {
    const isSelected = selectedLocations.some(loc => loc.id === location.id);
    if (isSelected) {
      setSelectedLocations(selectedLocations.filter(loc => loc.id !== location.id));
    } else {
      setSelectedLocations([...selectedLocations, location]);
    }
  };

  const handleViewDetails = (location: MediaLocation) => {
    const locationWithDetails = getLocationWithDetails(location.id);
    if (locationWithDetails) {
      setSelectedLocation(locationWithDetails);
      setDetailOpen(true);
    }
  };

  const handleMapClick = (coords: { lat: number; lng: number }) => {
    setClickedCoordinates(coords);
    setEditingLocation(null);
    setFormOpen(true);
  };

  const handleLocationSelect = (location: MediaLocation) => {
    mapRef.current?.flyToLocation(location);
    const locationWithDetails = getLocationWithDetails(location.id);
    if (locationWithDetails) {
      setSelectedLocation(locationWithDetails);
      setDetailOpen(true);
    }
  };

  const handleEdit = (location: LocationWithDetails) => {
    setEditingLocation(location);
    setFormOpen(true);
  };

  const handleDelete = async (locationId: string) => {
    try {
      await deleteLocation.mutateAsync(locationId);
      toast.success("Location deleted successfully");
      setDetailOpen(false);
    } catch (error) {
      console.error("Error deleting location:", error);
      toast.error("Failed to delete location");
    }
  };

  const handleClearSelection = () => {
    setSelectedLocations([]);
    setSelectionMode('normal');
  };

  const handleCreateCampaignSelect = () => {
    setSelectionMode('campaign-select');
    toast.info("Selection mode activated. Click pins to select locations for your campaign.");
  };

  const handleExitSelectionMode = () => {
    setSelectionMode('normal');
    setSelectedLocations([]);
  };

  const handleFilterByAgency = (agency: string) => {
    setFilters(prev => ({
      ...prev,
      agencies: [agency]
    }));
  };

  const handleViewCampaign = (campaignId: string) => {
    setSelectedCampaignForDetail(campaignId);
  };

  // Set up right-click context menu on map
  useEffect(() => {
    // Wait for map to be ready
    const timer = setTimeout(() => {
      const mapContainer = document.querySelector('.mapboxgl-canvas');
      if (!mapContainer) return;

      const handleContextMenu = (e: MouseEvent) => {
        e.preventDefault();
        
        // Get map instance from ref
        const mapInstance = (mapRef.current as any)?.map?.current;
        if (mapInstance) {
          // Convert screen coordinates to map coordinates
          const point = mapInstance.unproject([e.clientX, e.clientY]);
          setClickedCoordinates({ lat: point.lat, lng: point.lng });
        }
        
        setContextMenuPos({ x: e.clientX, y: e.clientY });
      };

      const handleClick = () => {
        setContextMenuPos(null);
      };

      mapContainer.addEventListener('contextmenu', handleContextMenu);
      document.addEventListener('click', handleClick);

      return () => {
        mapContainer.removeEventListener('contextmenu', handleContextMenu);
        document.removeEventListener('click', handleClick);
      };
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="relative h-[calc(100vh-64px)] w-full overflow-hidden bg-muted/20">
        <Skeleton className="absolute inset-0" />
      </div>
    );
  }

  return (
    <div className="relative h-[calc(100vh-64px)] w-full overflow-hidden">
      {selectionMode === 'campaign-select' && (
        <div className="absolute top-md left-1/2 -translate-x-1/2 z-20 bg-primary/90 backdrop-blur-md text-primary-foreground px-lg py-sm rounded-lg shadow-xl border border-primary-foreground/20 flex items-center gap-sm">
          <Target className="h-5 w-5" />
          <span className="font-medium">Selection Mode - Click pins to select locations</span>
          <Button size="sm" variant="secondary" onClick={handleExitSelectionMode} className="ml-4">Exit</Button>
        </div>
      )}

      <div className="absolute inset-0">
        <LocationMap
          locations={filteredLocations}
          selectedLocationId={selectedLocations.map(l => l.id)}
          campaignLocationIds={campaignLocationIds}
          onLocationClick={handleLocationClick}
          onViewDetails={handleViewDetails}
          onEdit={handleEdit}
          onMapClick={isAdmin && selectionMode === 'normal' ? handleMapClick : undefined}
          selectionMode={selectionMode}
          isAdmin={isAdmin}
          ref={mapRef}
        />
      </div>

      {/* Custom context menu portal */}
      {contextMenuPos && createPortal(
        <div
          className={cn(
            "fixed z-dropdown min-w-[200px] overflow-hidden rounded-lg border bg-popover p-1 text-popover-foreground shadow-xl",
            "animate-in fade-in-0 zoom-in-95"
          )}
          style={{
            left: `${contextMenuPos.x}px`,
            top: `${contextMenuPos.y}px`,
          }}
        >
          {isAdmin && (
            <button
              onClick={() => {
                setEditingLocation(null);
                setFormOpen(true);
                setContextMenuPos(null);
              }}
              className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <MapPin className="mr-2 h-4 w-4" />
              Add Location Here
            </button>
          )}
          <button
            onClick={() => {
              handleCreateCampaignSelect();
              setContextMenuPos(null);
            }}
            className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <Target className="mr-2 h-4 w-4" />
            Select Locations for Campaign
          </button>
          <button
            onClick={() => {
              setPlannerOpen(true);
              setContextMenuPos(null);
            }}
            className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Campaign
          </button>
          <button
            onClick={() => {
              setCampaignsListOpen(true);
              setContextMenuPos(null);
            }}
            className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <FolderOpen className="mr-2 h-4 w-4" />
            View All Campaigns
          </button>
          {isAdmin && (
            <button
              onClick={() => {
                setVendorsOpen(true);
                setContextMenuPos(null);
              }}
              className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <Layers className="mr-2 h-4 w-4" />
              Manage Vendors
            </button>
          )}
        </div>,
        document.body
      )}

      <div className="absolute top-md left-md z-30 flex flex-col gap-xs max-w-sm">
        <LocationSearch locations={filteredLocations} onLocationSelect={handleLocationSelect} />
        
        {/* Floating Filter Box below search */}
        <FloatingFilterBox
          filters={filters}
          onFiltersChange={setFilters}
          availableCities={cities}
          availableAgencies={agencies}
          campaigns={campaigns || []}
        />
      </div>

      <div className="absolute top-md right-md z-10 flex gap-xs">
        <Button onClick={() => setCampaignsListOpen(true)} variant="secondary" className="bg-background/90 backdrop-blur-md shadow-xl border border-border/20">
          <FolderOpen className="h-4 w-4 mr-2" />Campaigns
        </Button>
        {isAdmin && (
          <>
            <Button onClick={() => { 
              setEditingLocation(null); 
              setClickedCoordinates(null); 
              setFormOpen(true); 
            }} className="bg-background/90 backdrop-blur-md shadow-xl border border-border/20">
              <Plus className="h-4 w-4 mr-2" />Add Location
            </Button>
            <Button onClick={() => setUploadOpen(true)} variant="secondary" className="bg-background/90 backdrop-blur-md shadow-xl border border-border/20">
              <Upload className="h-4 w-4 mr-2" />Bulk Upload
            </Button>
          </>
        )}
      </div>

      <div className="absolute bottom-md left-md z-10 bg-background/90 backdrop-blur-md rounded-lg shadow-xl border border-white/10 p-md">
        <div className="flex gap-md text-body-sm">
          <div><span className="text-muted-foreground">Total:</span><span className="ml-xs font-semibold">{filteredLocations.length}</span></div>
          <div><span className="text-muted-foreground">Selected:</span><span className="ml-2 font-semibold text-primary">{selectedLocations.length}</span></div>
        </div>
      </div>

      {selectedLocations.length > 0 && (
        <div className="absolute bottom-md right-md z-10 bg-background/90 backdrop-blur-md rounded-lg shadow-xl border border-white/10 p-md max-w-sm max-h-[400px] overflow-y-auto">
          <div className="flex items-center justify-between mb-sm">
            <h3 className="font-semibold">{selectionMode === 'campaign-select' ? 'Selected for Campaign' : 'Selected Locations'} ({selectedLocations.length})</h3>
            {selectionMode === 'campaign-select' && <Badge variant="default" className="text-xs"><Target className="h-3 w-3 mr-1" />Active</Badge>}
          </div>
          <div className="space-y-2 mb-md">
            {selectedLocations.map(loc => (
              <div key={loc.id} className="flex justify-between items-center p-2 bg-background/50 rounded text-sm">
                <span className="truncate flex-1">{loc.name}</span>
                <Button size="sm" variant="ghost" onClick={() => handleLocationClick(loc)} className="h-6 w-6 p-0 hover:bg-destructive/20"><X className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            {selectionMode === 'campaign-select' ? (
              <>
                <Button onClick={handleExitSelectionMode} variant="outline" size="sm" className="flex-1">Exit Selection</Button>
                <Button onClick={() => setPlannerOpen(true)} size="sm" className="flex-1">Convert to Campaign</Button>
              </>
            ) : (
              <>
                <Button onClick={handleClearSelection} variant="outline" size="sm" className="flex-1">Clear</Button>
                <Button onClick={() => setPlannerOpen(true)} size="sm" className="flex-1">Create Campaign</Button>
              </>
            )}
          </div>
        </div>
      )}

      <LocationDetailPopup 
        open={detailOpen} 
        onOpenChange={setDetailOpen} 
        location={selectedLocation} 
        onEdit={() => selectedLocation && handleEdit(selectedLocation)} 
        onDelete={() => selectedLocation && handleDelete(selectedLocation.id)} 
      />
      <LocationFormDialog 
        open={formOpen} 
        onClose={() => { setFormOpen(false); setEditingLocation(null); setClickedCoordinates(null); }} 
        location={editingLocation} 
        initialCoordinates={clickedCoordinates} 
      />
      <CampaignPlannerDialog
        open={plannerOpen}
        onClose={() => {
          setPlannerOpen(false);
          setSelectedLocations([]);
          setSelectionMode('normal');
        }}
        locations={selectedLocations}
      />
      <BulkLocationUploadDialog open={uploadOpen} onClose={() => setUploadOpen(false)} />
      <CampaignsListDialog 
        open={campaignsListOpen} 
        onClose={() => setCampaignsListOpen(false)} 
        onCreateNew={() => { setCampaignsListOpen(false); setPlannerOpen(true); }} 
        onViewCampaign={handleViewCampaign}
      />
      <VendorsDialog open={vendorsOpen} onClose={() => setVendorsOpen(false)} locations={locations} onFilterByAgency={handleFilterByAgency} />
      {selectedCampaignForDetail && (
        <CampaignDetailDialog
          campaign={campaigns.find(c => c.id === selectedCampaignForDetail) || null}
          open={!!selectedCampaignForDetail}
          onClose={() => setSelectedCampaignForDetail(null)}
        />
      )}
    </div>
  );
}
