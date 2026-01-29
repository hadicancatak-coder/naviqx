import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, GripVertical } from "lucide-react";
import { useUtmPlatforms, useCreatePlatform, useUpdatePlatform, useDeletePlatform, useUpdatePlatformOrder } from "@/hooks/useUtmPlatforms";
import { useUtmMediums } from "@/hooks/useUtmMediums";
import { checkPlatformDependencies, formatDependencyMessage } from "@/lib/selectorDependencyCheck";
import { toast } from "sonner";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
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

export function UtmPlatformManager() {
  const { data: platforms = [], isLoading } = useUtmPlatforms();
  const { data: mediums = [] } = useUtmMediums();
  const createPlatform = useCreatePlatform();
  const updatePlatform = useUpdatePlatform();
  const deletePlatform = useDeletePlatform();
  const updatePlatformOrder = useUpdatePlatformOrder();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [editingPlatform, setEditingPlatform] = useState<any>(null);
  const [platformForm, setPlatformForm] = useState({ name: "", utm_medium: "" });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [platformToDelete, setPlatformToDelete] = useState<any>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleOpenDialog = (platform: any = null) => {
    if (platform) {
      setEditingPlatform(platform);
      setPlatformForm({ name: platform.name, utm_medium: platform.utm_medium || "" });
    } else {
      setEditingPlatform(null);
      setPlatformForm({ name: "", utm_medium: "" });
    }
    setIsDialogOpen(true);
  };

  const handleSavePlatform = () => {
    if (!platformForm.name.trim()) {
      toast.error("Platform name is required");
      return;
    }

    if (!platformForm.utm_medium) {
      toast.error("UTM medium is required");
      return;
    }

    if (editingPlatform) {
      updatePlatform.mutate(
        { id: editingPlatform.id, name: platformForm.name, utm_medium: platformForm.utm_medium },
        {
          onSuccess: () => {
            setIsDialogOpen(false);
            setEditingPlatform(null);
            setPlatformForm({ name: "", utm_medium: "" });
          }
        }
      );
    } else {
      createPlatform.mutate(
        { name: platformForm.name, utm_medium: platformForm.utm_medium, is_active: true, display_order: platforms.length },
        {
          onSuccess: () => {
            setIsDialogOpen(false);
            setPlatformForm({ name: "", utm_medium: "" });
          }
        }
      );
    }
  };

  const handleDeleteClick = async (platform: any) => {
    const dependencies = await checkPlatformDependencies(platform.name);
    if (!dependencies.canDelete) {
      toast.error("Cannot delete platform", {
        description: formatDependencyMessage(dependencies.dependencies),
        duration: 5000
      });
      return;
    }
    setPlatformToDelete(platform);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (platformToDelete) {
      deletePlatform.mutate(platformToDelete.id, {
        onSuccess: () => {
          setDeleteDialogOpen(false);
          setPlatformToDelete(null);
        }
      });
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over.id && platforms) {
      const oldIndex = platforms.findIndex((p) => p.id === active.id);
      const newIndex = platforms.findIndex((p) => p.id === over.id);
      const reordered = arrayMove(platforms, oldIndex, newIndex);
      
      const updates = reordered.map((platform, index) => ({
        id: platform.id,
        display_order: index,
      }));
      
      updatePlatformOrder.mutate(updates);
    }
  };

  if (isLoading) {
    return <div className="text-center text-muted-foreground py-8">Loading platforms...</div>;
  }

  return (
    <>
      <Card>
        <CardContent className="p-lg">
          <div className="flex justify-between items-center mb-md">
            <h3 className="text-heading-sm font-semibold">UTM Platforms</h3>
            <Button onClick={() => handleOpenDialog()} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Platform
            </Button>
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Platform Name</TableHead>
                  <TableHead>UTM Medium</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {platforms.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      No platforms yet. Click "Add Platform" to create one.
                    </TableCell>
                  </TableRow>
                ) : (
                  <SortableContext items={platforms.map(p => p.id)} strategy={verticalListSortingStrategy}>
                    {platforms.map((platform) => (
                      <SortableRow key={platform.id} id={platform.id}>
                        <TableCell className="font-medium">{platform.name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{platform.utm_medium || 'Not set'}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenDialog(platform)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteClick(platform)}
                            >
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
            <DialogTitle>{editingPlatform ? "Edit Platform" : "Add Platform"}</DialogTitle>
            <DialogDescription>
              {editingPlatform ? "Update platform details" : "Add a new UTM platform"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-md py-md">
            <div className="space-y-sm">
              <Label htmlFor="platform-name">Platform Name</Label>
              <Input
                id="platform-name"
                placeholder="e.g., Google, Facebook, LinkedIn"
                value={platformForm.name}
                onChange={(e) => setPlatformForm({ ...platformForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-sm">
              <Label htmlFor="utm-medium">UTM Medium</Label>
              <Select
                value={platformForm.utm_medium}
                onValueChange={(value) => setPlatformForm({ ...platformForm, utm_medium: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select UTM medium" />
                </SelectTrigger>
                <SelectContent>
                  {mediums.map((medium) => (
                    <SelectItem key={medium.id} value={medium.name}>
                      {medium.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSavePlatform}>
              {editingPlatform ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Platform?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{platformToDelete?.name}"? This action cannot be undone.
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