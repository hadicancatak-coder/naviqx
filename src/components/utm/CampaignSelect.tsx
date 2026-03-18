import { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronDown, Plus, Pencil, Trash2, Check, X, Loader2, Search } from "lucide-react";
import {
  useUtmCampaigns,
  useCreateUtmCampaign,
  useUpdateUtmCampaign,
  useDeleteUtmCampaign,
} from "@/hooks/useUtmCampaigns";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";
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

interface CampaignSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}

export function CampaignSelect({ value, onValueChange, className }: CampaignSelectProps) {
  const [open, setOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [editName, setEditName] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: campaigns, isLoading } = useUtmCampaigns();
  const createCampaign = useCreateUtmCampaign();
  const updateCampaign = useUpdateUtmCampaign();
  const deleteCampaign = useDeleteUtmCampaign();

  const selectedCampaign = campaigns?.find((c) => c.id === value);

  const handleCreate = useCallback(async () => {
    if (!newName.trim()) return;
    try {
      const result = await createCampaign.mutateAsync({ name: newName.trim() });
      setNewName("");
      setIsAdding(false);
      if (result?.id) {
        onValueChange(result.id);
      }
    } catch (error) {
      logger.error("Failed to create campaign:", error);
    }
  }, [newName, createCampaign, onValueChange]);

  const handleUpdate = useCallback(async (id: string) => {
    if (!editName.trim()) return;
    try {
      await updateCampaign.mutateAsync({ id, name: editName.trim() });
      setEditingId(null);
      setEditName("");
    } catch (error) {
      logger.error("Failed to update campaign:", error);
    }
  }, [editName, updateCampaign]);

  const handleDelete = useCallback(async () => {
    if (!deleteId) return;
    try {
      await deleteCampaign.mutateAsync(deleteId);
      if (value === deleteId) {
        onValueChange("");
      }
      setDeleteId(null);
    } catch (error) {
      logger.error("Failed to delete campaign:", error);
    }
  }, [deleteId, deleteCampaign, value, onValueChange]);

  const startEdit = (id: string, name: string) => {
    setEditingId(id);
    setEditName(name);
    setIsAdding(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
  };

  const startAdd = () => {
    setIsAdding(true);
    setEditingId(null);
    setNewName("");
  };

  const cancelAdd = () => {
    setIsAdding(false);
    setNewName("");
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn("justify-between h-8 text-metadata font-normal", className)}
          >
            {isLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : selectedCampaign ? (
              <span className="truncate">{selectedCampaign.name}</span>
            ) : (
              <span className="text-muted-foreground">Select campaign</span>
            )}
            <ChevronDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-0 liquid-glass-dropdown" align="start">
          {/* Scrollable campaign list */}
          <div className="max-h-[200px] overflow-y-auto p-xs">
            {/* Campaign list */}
            {campaigns?.map((campaign) => (
              <div
                key={campaign.id}
                className={cn(
                  "flex items-center gap-xs px-sm py-xs rounded-md transition-smooth group",
                  campaign.id === value ? "bg-primary/10 text-primary" : "hover:bg-card-hover"
                )}
              >
                {editingId === campaign.id ? (
                  // Edit mode
                  <div className="flex items-center gap-xs flex-1">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-7 text-metadata flex-1"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleUpdate(campaign.id);
                        if (e.key === "Escape") cancelEdit();
                      }}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleUpdate(campaign.id)}
                      disabled={updateCampaign.isPending}
                    >
                      {updateCampaign.isPending ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Check className="h-3 w-3 text-success-text" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={cancelEdit}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  // View mode
                  <>
                    <button
                      className="flex-1 text-left text-metadata truncate"
                      onClick={() => {
                        onValueChange(campaign.id);
                        setOpen(false);
                      }}
                    >
                      {campaign.name}
                    </button>
                    <div className="flex items-center gap-xs opacity-0 group-hover:opacity-100 transition-smooth">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          startEdit(campaign.id, campaign.name);
                        }}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteId(campaign.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}

            {/* Empty state */}
            {(!campaigns || campaigns.length === 0) && !isAdding && (
              <div className="px-sm py-md text-center text-muted-foreground text-metadata">
                No campaigns yet
              </div>
            )}
          </div>

          {/* Add new section - ALWAYS VISIBLE outside ScrollArea */}
          <div className="border-t border-border p-xs">
            {isAdding ? (
              <div className="flex items-center gap-xs px-sm py-xs">
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Campaign name"
                  className="h-7 text-metadata flex-1"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreate();
                    if (e.key === "Escape") cancelAdd();
                  }}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={handleCreate}
                  disabled={createCampaign.isPending || !newName.trim()}
                >
                  {createCampaign.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Check className="h-3 w-3 text-success-text" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={cancelAdd}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <button
                className="w-full flex items-center gap-xs px-sm py-xs text-metadata text-muted-foreground hover:text-foreground transition-smooth rounded-md hover:bg-card-hover"
                onClick={startAdd}
              >
                <Plus className="h-3 w-3" />
                Add New Campaign
              </button>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Campaign</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this campaign? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteCampaign.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
