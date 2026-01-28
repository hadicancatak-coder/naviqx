import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Pencil, Trash2, Search, GripVertical, MapPin } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAllCities, useCreateCity, useUpdateCity, useDeleteCity } from "@/hooks/useSystemCities";
import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { checkCityDependencies, formatDependencyMessage } from "@/lib/selectorDependencyCheck";
import { logger } from "@/lib/logger";

function SortableRow({ id, children }: { id: string; children: React.ReactNode }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <tr ref={setNodeRef} style={style} className="border-b transition-colors hover:bg-muted/50">
      <td className="p-md">
        <div {...attributes} {...listeners} className="cursor-move">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      </td>
      {children}
    </tr>
  );
}

export default function SelectorsManagement() {
  // Force session refresh on page load
  useEffect(() => {
    const refreshSession = async () => {
      try {
        const { error } = await supabase.auth.refreshSession();
        if (error) {
          logger.error('Session refresh failed:', error);
          toast.error('Session expired. Please log out and log back in.');
        }
      } catch (err) {
        logger.error('Session refresh error:', err);
      }
    };

    refreshSession();
  }, []);

  const checkAdminSession = async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session) {
      toast.error('Session expired', {
        description: 'Please log out and log back in',
        duration: 7000
      });
      return false;
    }
    
    return true;
  };

  const [searchQuery, setSearchQuery] = useState("");
  
  // City state
  const [isCityDialogOpen, setIsCityDialogOpen] = useState(false);
  const [editingCity, setEditingCity] = useState<any>(null);
  const [cityForm, setCityForm] = useState({ name: "", country: "", display_order: 0 });
  const [isDeleteCityDialogOpen, setIsDeleteCityDialogOpen] = useState(false);
  const [cityToDelete, setCityToDelete] = useState<{ id: string; name: string } | null>(null);

  // Hooks
  const { data: cities, isLoading: citiesLoading } = useAllCities();
  const createCity = useCreateCity();
  const updateCity = useUpdateCity();
  const deleteCity = useDeleteCity();

  // Drag sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // City handlers
  const handleCitySubmit = async () => {
    if (editingCity) {
      await updateCity.mutateAsync({ id: editingCity.id, ...cityForm });
    } else {
      await createCity.mutateAsync(cityForm);
    }
    setIsCityDialogOpen(false);
    setEditingCity(null);
    setCityForm({ name: "", country: "", display_order: 0 });
  };

  const handleDeleteCity = async (id: string, name: string) => {
    if (!await checkAdminSession()) return;

    const { canDelete, dependencies } = await checkCityDependencies(name);
    
    if (!canDelete) {
      toast.error('Cannot delete city', {
        description: formatDependencyMessage(dependencies),
        duration: 7000,
      });
      return;
    }
    
    setCityToDelete({ id, name });
    setIsDeleteCityDialogOpen(true);
  };

  const confirmDeleteCity = async () => {
    if (cityToDelete) {
      await deleteCity.mutateAsync(cityToDelete.id);
      setIsDeleteCityDialogOpen(false);
      setCityToDelete(null);
    }
  };

  const handleCityDragEnd = async (event: any) => {
    const { active, over } = event;
    if (active.id !== over.id && cities) {
      const oldIndex = cities.findIndex((c) => c.id === active.id);
      const newIndex = cities.findIndex((c) => c.id === over.id);
      const reordered = arrayMove(cities, oldIndex, newIndex);
      
      for (let i = 0; i < reordered.length; i++) {
        if (reordered[i].display_order !== i) {
          await updateCity.mutateAsync({ id: reordered[i].id, display_order: i });
        }
      }
    }
  };

  const filteredCities = cities?.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.country.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="container mx-auto p-md md:p-lg space-y-lg max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-page-title font-bold">Selectors Management</h1>
          <p className="text-body text-muted-foreground mt-1">
            Manage cities used across the system
          </p>
        </div>
        <AdminStatusBadge />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle>Cities</CardTitle>
                <CardDescription>Manage cities for task assignments and location tracking</CardDescription>
              </div>
            </div>
            <Button onClick={() => { 
              setEditingCity(null); 
              setCityForm({ name: "", country: "", display_order: cities?.length || 0 }); 
              setIsCityDialogOpen(true); 
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Add City
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-md">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search cities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="border rounded-lg overflow-hidden">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleCityDragEnd}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {citiesLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Loading cities...
                      </TableCell>
                    </TableRow>
                  ) : filteredCities.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No cities found
                      </TableCell>
                    </TableRow>
                  ) : (
                    <SortableContext items={filteredCities.map(c => c.id)} strategy={verticalListSortingStrategy}>
                      {filteredCities.map((city) => (
                        <SortableRow key={city.id} id={city.id}>
                          <TableCell>{city.display_order}</TableCell>
                          <TableCell className="font-medium">{city.name}</TableCell>
                          <TableCell>{city.country}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => {
                                  setEditingCity(city);
                                  setCityForm({
                                    name: city.name,
                                    country: city.country,
                                    display_order: city.display_order
                                  });
                                  setIsCityDialogOpen(true);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => handleDeleteCity(city.id, city.name)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </SortableRow>
                      ))}
                    </SortableContext>
                  )}
                </TableBody>
              </Table>
            </DndContext>
          </div>
        </CardContent>
      </Card>

      {/* City Dialog */}
      <Dialog open={isCityDialogOpen} onOpenChange={setIsCityDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCity ? "Edit City" : "Add City"}</DialogTitle>
            <DialogDescription>
              {editingCity ? "Update the city details." : "Add a new city to the system."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-md py-md">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input 
                value={cityForm.name} 
                onChange={(e) => setCityForm({ ...cityForm, name: e.target.value })} 
                placeholder="Dubai" 
              />
            </div>
            <div className="space-y-2">
              <Label>Country</Label>
              <Input 
                value={cityForm.country} 
                onChange={(e) => setCityForm({ ...cityForm, country: e.target.value })} 
                placeholder="UAE" 
              />
            </div>
            <div className="space-y-2">
              <Label>Display Order</Label>
              <Input 
                type="number" 
                value={cityForm.display_order} 
                onChange={(e) => setCityForm({ ...cityForm, display_order: Number(e.target.value) })} 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCityDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCitySubmit} disabled={!cityForm.name || !cityForm.country}>
              {editingCity ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete City Dialog */}
      <AlertDialog open={isDeleteCityDialogOpen} onOpenChange={setIsDeleteCityDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete City</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{cityToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteCity}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
