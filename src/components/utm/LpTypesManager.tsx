import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useUtmLpTypes, useCreateLpType, useUpdateLpType, useDeleteLpType, UtmLpType } from "@/hooks/useUtmLpTypes";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";

export function LpTypesManager() {
  const { data: lpTypes = [], isLoading } = useUtmLpTypes();
  const createLpType = useCreateLpType();
  const updateLpType = useUpdateLpType();
  const deleteLpType = useDeleteLpType();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [lpTypeToDelete, setLpTypeToDelete] = useState<UtmLpType | null>(null);
  const [editingLpType, setEditingLpType] = useState<UtmLpType | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    default_url_pattern: '',
    display_order: lpTypes.length,
  });

  const handleOpenDialog = (lpType?: UtmLpType) => {
    if (lpType) {
      setEditingLpType(lpType);
      setFormData({
        name: lpType.name,
        description: lpType.description || '',
        default_url_pattern: lpType.default_url_pattern || '',
        display_order: lpType.display_order,
      });
    } else {
      setEditingLpType(null);
      setFormData({
        name: '',
        description: '',
        default_url_pattern: '',
        display_order: lpTypes.length,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.name.trim()) return;

    if (editingLpType) {
      updateLpType.mutate(
        { id: editingLpType.id, ...formData, is_active: true },
        { onSuccess: () => setIsDialogOpen(false) }
      );
    } else {
      createLpType.mutate(
        { ...formData, is_active: true },
        { onSuccess: () => setIsDialogOpen(false) }
      );
    }
  };

  const handleDeleteClick = (lpType: UtmLpType) => {
    setLpTypeToDelete(lpType);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (lpTypeToDelete) {
      deleteLpType.mutate(lpTypeToDelete.id, {
        onSuccess: () => {
          setDeleteDialogOpen(false);
          setLpTypeToDelete(null);
        }
      });
    }
  };

  if (isLoading) {
    return <TableSkeleton />;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Landing Page Types</CardTitle>
              <CardDescription>
                Manage landing page categories for better rule organization
              </CardDescription>
            </div>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add LP Type
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Default Pattern</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lpTypes.map((lpType) => (
                <TableRow key={lpType.id}>
                  <TableCell>
                    <Badge variant="outline">{lpType.display_order}</Badge>
                  </TableCell>
                  <TableCell className="font-medium">{lpType.name}</TableCell>
                  <TableCell className="text-muted-foreground max-w-xs truncate">
                    {lpType.description || '-'}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-metadata max-w-xs truncate">
                    {lpType.default_url_pattern || '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(lpType)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(lpType)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingLpType ? 'Edit LP Type' : 'Add LP Type'}
            </DialogTitle>
            <DialogDescription>
              Define a landing page category for organizing UTM rules
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Product Pages"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe when to use this LP type"
              />
            </div>
            <div>
              <Label htmlFor="pattern">Default URL Pattern</Label>
              <Input
                id="pattern"
                value={formData.default_url_pattern}
                onChange={(e) => setFormData({ ...formData, default_url_pattern: e.target.value })}
                placeholder="e.g., /products/"
              />
            </div>
            <div>
              <Label htmlFor="order">Display Order</Label>
              <Input
                id="order"
                type="number"
                value={formData.display_order}
                onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingLpType ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete LP Type?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{lpTypeToDelete?.name}"? This action cannot be undone.
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
