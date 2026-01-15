import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, GripVertical } from "lucide-react";
import { useUtmMediums, useCreateMedium, useUpdateMedium, useDeleteMedium, useUpdateMediumOrder } from "@/hooks/useUtmMediums";
import { checkMediumDependencies, formatDependencyMessage } from "@/lib/selectorDependencyCheck";
import { toast } from "sonner";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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

export function UtmMediumManager() {
  const { data: mediums = [], isLoading } = useUtmMediums();
  const createMedium = useCreateMedium();
  const updateMedium = useUpdateMedium();
  const deleteMedium = useDeleteMedium();
  const updateMediumOrder = useUpdateMediumOrder();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMedium, setEditingMedium] = useState<any>(null);
  const [mediumForm, setMediumForm] = useState({ name: "" });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [mediumToDelete, setMediumToDelete] = useState<any>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleOpenDialog = (medium: any = null) => {
    if (medium) {
      setEditingMedium(medium);
      setMediumForm({ name: medium.name });
    } else {
      setEditingMedium(null);
      setMediumForm({ name: "" });
    }
    setIsDialogOpen(true);
  };

  const handleSaveMedium = () => {
    if (!mediumForm.name.trim()) {
      toast.error("Medium name is required");
      return;
    }

    if (editingMedium) {
      updateMedium.mutate(
        { id: editingMedium.id, name: mediumForm.name, display_order: editingMedium.display_order },
        {
          onSuccess: () => {
            setIsDialogOpen(false);
            setEditingMedium(null);
            setMediumForm({ name: "" });
          }
        }
      );
    } else {
      createMedium.mutate(
        { name: mediumForm.name, display_order: mediums.length },
        {
          onSuccess: () => {
            setIsDialogOpen(false);
            setMediumForm({ name: "" });
          }
        }
      );
    }
  };

  const handleDeleteClick = async (medium: any) => {
    const dependencies = await checkMediumDependencies(medium.name);
    if (!dependencies.canDelete) {
      toast.error("Cannot delete medium", {
        description: formatDependencyMessage(dependencies.dependencies),
        duration: 5000
      });
      return;
    }
    setMediumToDelete(medium);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (mediumToDelete) {
      deleteMedium.mutate(mediumToDelete.id, {
        onSuccess: () => {
          setDeleteDialogOpen(false);
          setMediumToDelete(null);
        }
      });
    }
  };

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    if (active.id !== over.id && mediums) {
      const oldIndex = mediums.findIndex((m) => m.id === active.id);
      const newIndex = mediums.findIndex((m) => m.id === over.id);
      const reordered = arrayMove(mediums, oldIndex, newIndex);
      
      const updates = reordered.map((medium, index) => ({
        id: medium.id,
        display_order: index,
      }));
      
      updateMediumOrder.mutate(updates);
    }
  };

  if (isLoading) {
    return <div className="text-center text-muted-foreground py-8">Loading mediums...</div>;
  }

  return (
    <>
      <Card>
        <CardContent className="p-lg">
          <div className="flex justify-between items-center mb-md">
            <h3 className="text-heading-sm font-semibold">UTM Mediums</h3>
            <Button onClick={() => handleOpenDialog()} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Medium
            </Button>
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Medium Name</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mediums.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      No mediums configured yet
                    </TableCell>
                  </TableRow>
                ) : (
                  <SortableContext items={mediums.map(m => m.id)} strategy={verticalListSortingStrategy}>
                    {mediums.map((medium) => (
                      <SortableRow key={medium.id} id={medium.id}>
                        <TableCell className="font-medium">{medium.name}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-sm">
                            <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(medium)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(medium)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
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
        </CardContent>
      </Card>

      {/* Edit/Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingMedium ? "Edit Medium" : "Add Medium"}</DialogTitle>
            <DialogDescription>
              {editingMedium ? "Update medium name" : "Add a new UTM medium"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-md py-md">
            <div className="space-y-sm">
              <Label htmlFor="medium-name">Medium Name</Label>
              <Input
                id="medium-name"
                placeholder="e.g., paid_social, paid_search, email"
                value={mediumForm.name}
                onChange={(e) => setMediumForm({ name: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveMedium}>
              {editingMedium ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Medium?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{mediumToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}