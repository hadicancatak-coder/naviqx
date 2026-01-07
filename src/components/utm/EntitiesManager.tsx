import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Pencil, Trash2, Search, GripVertical, Building2 } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAllEntities, useCreateEntity, useUpdateEntity, useDeleteEntity } from "@/hooks/useSystemEntities";
import { toast } from "sonner";
import { checkEntityDependencies, formatDependencyMessage } from "@/lib/selectorDependencyCheck";

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

const WEBSITE_PARAM_OPTIONS = [
  { value: 'cfi', label: 'CFI (cfi)' },
  { value: 'cfifinancial', label: 'CFI Financial (cfifinancial)' },
  { value: 'cfiglobal', label: 'CFI Global (cfiglobal)' },
  { value: 'custom', label: 'Custom...' },
];

export function EntitiesManager() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEntity, setEditingEntity] = useState<any>(null);
  const [entityForm, setEntityForm] = useState({ 
    name: "", 
    code: "", 
    emoji: "", 
    display_order: 0, 
    website_param: "", 
    customWebsiteParam: "" 
  });
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [entityToDelete, setEntityToDelete] = useState<{ id: string; code: string } | null>(null);

  const { data: entities, isLoading } = useAllEntities();
  const createEntity = useCreateEntity();
  const updateEntity = useUpdateEntity();
  const deleteEntity = useDeleteEntity();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleSubmit = async () => {
    const websiteParam = entityForm.website_param === 'custom' 
      ? entityForm.customWebsiteParam 
      : entityForm.website_param;
    
    const { customWebsiteParam, ...entityData } = entityForm;
      
    if (editingEntity) {
      await updateEntity.mutateAsync({ 
        id: editingEntity.id, 
        ...entityData, 
        website_param: websiteParam 
      });
    } else {
      await createEntity.mutateAsync({ 
        ...entityData, 
        website_param: websiteParam, 
        is_active: true 
      });
    }
    setIsDialogOpen(false);
    setEditingEntity(null);
    setEntityForm({ name: "", code: "", emoji: "", display_order: 0, website_param: "", customWebsiteParam: "" });
  };

  const handleDelete = async (id: string, code: string) => {
    const { canDelete, dependencies } = await checkEntityDependencies(code);
    
    if (!canDelete) {
      toast.error('Cannot delete entity', {
        description: formatDependencyMessage(dependencies),
        duration: 7000,
      });
      return;
    }
    
    setEntityToDelete({ id, code });
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (entityToDelete) {
      await deleteEntity.mutateAsync(entityToDelete.id);
      setIsDeleteDialogOpen(false);
      setEntityToDelete(null);
    }
  };

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    if (active.id !== over.id && entities) {
      const oldIndex = entities.findIndex((e) => e.id === active.id);
      const newIndex = entities.findIndex((e) => e.id === over.id);
      const reordered = arrayMove(entities, oldIndex, newIndex);
      
      for (let i = 0; i < reordered.length; i++) {
        if (reordered[i].display_order !== i) {
          await updateEntity.mutateAsync({ id: reordered[i].id, display_order: i });
        }
      }
    }
  };

  const filteredEntities = entities?.filter(e => 
    e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.code.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const openEditDialog = (entity: any) => {
    setEditingEntity(entity);
    const isCustomParam = entity.website_param && !WEBSITE_PARAM_OPTIONS.some(opt => opt.value === entity.website_param && opt.value !== 'custom');
    setEntityForm({ 
      name: entity.name, 
      code: entity.code, 
      emoji: entity.emoji || "",
      display_order: entity.display_order,
      website_param: isCustomParam ? 'custom' : (entity.website_param || ''),
      customWebsiteParam: isCustomParam ? entity.website_param : ''
    });
    setIsDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle>Entities</CardTitle>
              <CardDescription>Manage business entities used across UTM links</CardDescription>
            </div>
          </div>
          <Button onClick={() => { 
            setEditingEntity(null); 
            setEntityForm({ name: "", code: "", emoji: "", display_order: entities?.length || 0, website_param: "", customWebsiteParam: "" }); 
            setIsDialogOpen(true); 
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Entity
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-md">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search entities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="border rounded-lg overflow-hidden">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Emoji</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Website Param</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Loading entities...
                    </TableCell>
                  </TableRow>
                ) : filteredEntities.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No entities found
                    </TableCell>
                  </TableRow>
                ) : (
                  <SortableContext items={filteredEntities.map(e => e.id)} strategy={verticalListSortingStrategy}>
                    {filteredEntities.map((entity) => (
                      <SortableRow key={entity.id} id={entity.id}>
                        <TableCell>{entity.display_order}</TableCell>
                        <TableCell className="text-xl">{entity.emoji || '—'}</TableCell>
                        <TableCell className="font-medium">{entity.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{entity.code}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {entity.website_param || '—'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={entity.is_active ? "default" : "secondary"}>
                            {entity.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => openEditDialog(entity)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleDelete(entity.id, entity.code)}
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

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingEntity ? 'Edit Entity' : 'Add Entity'}</DialogTitle>
            <DialogDescription>
              {editingEntity ? 'Update entity details' : 'Create a new business entity'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-md">
            <div className="grid grid-cols-2 gap-md">
              <div className="space-y-xs">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={entityForm.name}
                  onChange={(e) => setEntityForm({ ...entityForm, name: e.target.value })}
                  placeholder="CFI International"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Code</Label>
                <Input
                  id="code"
                  value={entityForm.code}
                  onChange={(e) => setEntityForm({ ...entityForm, code: e.target.value.toUpperCase() })}
                  placeholder="CFI"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-md">
              <div className="space-y-xs">
                <Label htmlFor="emoji">Emoji</Label>
                <Input
                  id="emoji"
                  value={entityForm.emoji}
                  onChange={(e) => setEntityForm({ ...entityForm, emoji: e.target.value })}
                  placeholder="🌍"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="display_order">Display Order</Label>
                <Input
                  id="display_order"
                  type="number"
                  value={entityForm.display_order}
                  onChange={(e) => setEntityForm({ ...entityForm, display_order: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="website_param">Website Parameter</Label>
              <Select
                value={entityForm.website_param}
                onValueChange={(value) => setEntityForm({ ...entityForm, website_param: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select website parameter" />
                </SelectTrigger>
                <SelectContent>
                  {WEBSITE_PARAM_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {entityForm.website_param === 'custom' && (
              <div className="space-y-2">
                <Label htmlFor="customWebsiteParam">Custom Website Parameter</Label>
                <Input
                  id="customWebsiteParam"
                  value={entityForm.customWebsiteParam}
                  onChange={(e) => setEntityForm({ ...entityForm, customWebsiteParam: e.target.value })}
                  placeholder="Enter custom parameter"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!entityForm.name || !entityForm.code}>
              {editingEntity ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Entity</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{entityToDelete?.code}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
