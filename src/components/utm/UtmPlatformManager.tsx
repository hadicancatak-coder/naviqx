import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useUtmPlatforms, useCreatePlatform, useUpdatePlatform, useDeletePlatform } from "@/hooks/useUtmPlatforms";
import { useUtmMediums } from "@/hooks/useUtmMediums";
import { checkPlatformDependencies, formatDependencyMessage } from "@/lib/selectorDependencyCheck";
import { toast } from "sonner";

export function UtmPlatformManager() {
  const { data: platforms = [], isLoading } = useUtmPlatforms();
  const { data: mediums = [] } = useUtmMediums();
  const createPlatform = useCreatePlatform();
  const updatePlatform = useUpdatePlatform();
  const deletePlatform = useDeletePlatform();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlatform, setEditingPlatform] = useState<any>(null);
  const [platformForm, setPlatformForm] = useState({ name: "", utm_medium: "" });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [platformToDelete, setPlatformToDelete] = useState<any>(null);

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
        { name: platformForm.name, utm_medium: platformForm.utm_medium, is_active: true },
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

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Platform Name</TableHead>
                <TableHead>UTM Medium</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {platforms.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                    No platforms yet. Click "Add Platform" to create one.
                  </TableCell>
                </TableRow>
              ) : (
                platforms.map((platform) => (
                  <TableRow key={platform.id}>
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
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPlatform ? "Edit Platform" : "Add New Platform"}</DialogTitle>
            <DialogDescription>
              {editingPlatform 
                ? "Update the platform name and its UTM medium." 
                : "Create a new platform and assign its UTM medium."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-md py-md">
            <div className="space-y-xs">
              <Label htmlFor="platform-name">Platform Name</Label>
              <Input
                id="platform-name"
                value={platformForm.name}
                onChange={(e) =>
                  setPlatformForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="e.g., Google, Meta, TikTok"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="utm-medium">UTM Medium *</Label>
              <Select
                value={platformForm.utm_medium}
                onValueChange={(value) =>
                  setPlatformForm((prev) => ({ ...prev, utm_medium: value }))
                }
              >
                <SelectTrigger id="utm-medium">
                  <SelectValue placeholder="Select a medium" />
                </SelectTrigger>
                <SelectContent>
                  {mediums.map((medium) => (
                    <SelectItem key={medium.id} value={medium.name}>
                      {medium.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                This medium will always be used for {platformForm.name || "this platform"}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePlatform}>
              {editingPlatform ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
