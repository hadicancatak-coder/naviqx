import { useState, useMemo } from "react";
import { Plus, Search, LayoutTemplate, Trash2, MoreHorizontal } from "lucide-react";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLpMaps, useCreateLpMap, useDeleteLpMap, LpMap } from "@/hooks/useLpMaps";
import { useSystemEntities } from "@/hooks/useSystemEntities";
import { cn } from "@/lib/utils";

interface LpMapListProps {
  selectedMapId: string | null;
  onSelectMap: (mapId: string | null) => void;
}

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  review: "bg-warning-soft text-warning-text",
  approved: "bg-success-soft text-success-text",
  live: "bg-primary/20 text-primary",
};

export const LpMapList = ({ selectedMapId, onSelectMap }: LpMapListProps) => {
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [mapToDelete, setMapToDelete] = useState<LpMap | null>(null);

  // Create form state
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newEntityId, setNewEntityId] = useState<string | undefined>();

  const { data: maps = [], isLoading } = useLpMaps({ isActive: true });
  const { data: entities = [] } = useSystemEntities();
  const createMap = useCreateLpMap();
  const deleteMap = useDeleteLpMap();

  const filteredMaps = useMemo(() => {
    return maps.filter((map) => {
      const matchesSearch = map.name.toLowerCase().includes(search.toLowerCase());
      const matchesEntity = entityFilter === "all" || map.entity_id === entityFilter;
      const matchesStatus = statusFilter === "all" || map.status === statusFilter;
      return matchesSearch && matchesEntity && matchesStatus;
    });
  }, [maps, search, entityFilter, statusFilter]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const result = await createMap.mutateAsync({
      name: newName.trim(),
      description: newDescription.trim() || undefined,
      entity_id: newEntityId,
    });
    setShowCreateDialog(false);
    setNewName("");
    setNewDescription("");
    setNewEntityId(undefined);
    onSelectMap(result.id);
  };

  const handleDelete = async () => {
    if (!mapToDelete) return;
    await deleteMap.mutateAsync(mapToDelete.id);
    if (selectedMapId === mapToDelete.id) {
      onSelectMap(null);
    }
    setMapToDelete(null);
  };

  return (
    <>
      <div className="h-full flex flex-col bg-card border-r border-border">
        <div className="p-md border-b border-border space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-body-sm">LP Maps</h3>
            <Button size="sm" onClick={() => setShowCreateDialog(true)} className="h-7 text-metadata">
              <Plus className="h-3 w-3 mr-1" />
              New Map
            </Button>
          </div>

          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search maps..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>

          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 text-xs flex-1">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="review">Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="live">Live</SelectItem>
              </SelectContent>
            </Select>

            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="h-8 text-xs flex-1">
                <SelectValue placeholder="Entity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entities</SelectItem>
                {entities.map((entity) => (
                  <SelectItem key={entity.id} value={entity.id}>
                    {entity.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-3 space-y-2">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Loading maps...
              </div>
            ) : filteredMaps.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No maps found
              </div>
            ) : (
              filteredMaps.map((map) => (
                <div
                  key={map.id}
                  className={cn(
                    "group flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-smooth",
                    selectedMapId === map.id
                      ? "ring-2 ring-primary border-primary bg-card"
                      : "bg-card hover:bg-card-hover"
                  )}
                  onClick={() => onSelectMap(map.id)}
                >
                  <LayoutTemplate className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{map.name}</span>
                      <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", statusColors[map.status])}>
                        {map.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      {map.entity && <span>{map.entity.name}</span>}
                      <span>•</span>
                      <span>{format(new Date(map.created_at), "MMM d, yyyy")}</span>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMapToDelete(map);
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New LP Map</DialogTitle>
            <DialogDescription>
              Create a new landing page map to start building your LP structure
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="map-name">Name *</Label>
              <Input
                id="map-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="LP map name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="map-entity">Entity</Label>
              <Select value={newEntityId} onValueChange={setNewEntityId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select entity..." />
                </SelectTrigger>
                <SelectContent>
                  {entities.map((entity) => (
                    <SelectItem key={entity.id} value={entity.id}>
                      {entity.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="map-description">Description</Label>
              <Textarea
                id="map-description"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Brief description..."
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={!newName.trim() || createMap.isPending}>
                {createMap.isPending ? "Creating..." : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!mapToDelete} onOpenChange={() => setMapToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Map</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{mapToDelete?.name}"? This will remove all
              sections from this map. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
