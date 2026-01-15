import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Copy, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import type { Caption } from "@/pages/CaptionLibrary";
import { cn } from "@/lib/utils";
import { getStatusColor } from "@/lib/constants";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import { getContentForDisplay, getContentForCopy } from "@/lib/captionHelpers";

interface CaptionTableViewProps {
  captions: Caption[];
  onEdit: (caption: Caption) => void;
}

export function CaptionTableView({ captions, onEdit }: CaptionTableViewProps) {
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === captions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(captions.map((c) => c.id)));
    }
  };

  const handleCopyContent = (content: unknown, lang: "en" | "ar") => {
    const text = getContentForCopy(content, lang);
    if (!text) {
      toast.error(`No ${lang.toUpperCase()} content to copy`);
      return;
    }
    navigator.clipboard.writeText(text);
    toast.success(`${lang.toUpperCase()} content copied`);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("ad_elements").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete caption");
      return;
    }
    toast.success("Caption deleted");
    queryClient.invalidateQueries({ queryKey: ["ad-elements"] });
    setDeleteConfirmId(null);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    
    const { error } = await supabase
      .from("ad_elements")
      .delete()
      .in("id", Array.from(selectedIds));
    
    if (error) {
      toast.error("Failed to delete captions");
      return;
    }
    
    toast.success(`Deleted ${selectedIds.size} captions`);
    setSelectedIds(new Set());
    queryClient.invalidateQueries({ queryKey: ["ad-elements"] });
    setBulkDeleteConfirm(false);
  };

  // Status color now centralized in constants.ts

  return (
    <TooltipProvider>
      <div className="relative">
        {selectedIds.size > 0 && (
          <div className="sticky top-0 z-10 flex items-center gap-md px-md py-xs bg-muted border-b border-border">
            <span className="text-body-sm font-medium">
              {selectedIds.size} selected
            </span>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setBulkDeleteConfirm(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Selected
            </Button>
          </div>
        )}

        <Table>
          <TableHeader>
            <TableRow className="bg-elevated hover:bg-elevated">
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedIds.size === captions.length && captions.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead className="text-metadata font-medium">Type</TableHead>
              <TableHead className="text-metadata font-medium">EN Content</TableHead>
              <TableHead className="text-metadata font-medium">AR Content</TableHead>
              <TableHead className="text-metadata font-medium">Entity</TableHead>
              <TableHead className="text-metadata font-medium">Status</TableHead>
              <TableHead className="text-metadata font-medium">Uses</TableHead>
              <TableHead className="w-24 text-metadata font-medium">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {captions.map((caption) => {
              const enContent = getContentForDisplay(caption.content, "en");
              const arContent = getContentForDisplay(caption.content, "ar");

              return (
                <TableRow
                  key={caption.id}
                  className="hover:bg-card-hover transition-smooth group"
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(caption.id)}
                      onCheckedChange={() => toggleSelect(caption.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-metadata capitalize">
                      {caption.element_type}
                    </Badge>
                  </TableCell>
                  
                  {/* EN Content - Click to copy */}
                  <TableCell className="max-w-[200px]">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => handleCopyContent(caption.content, "en")}
                          className={cn(
                            "text-left text-body-sm truncate w-full px-2 py-1 rounded transition-smooth",
                            enContent 
                              ? "hover:bg-primary/10 cursor-pointer" 
                              : "text-muted-foreground/50 cursor-default"
                          )}
                        >
                          {enContent || "—"}
                        </button>
                      </TooltipTrigger>
                      {enContent && (
                        <TooltipContent side="top" className="max-w-sm">
                          <p className="text-body-sm">{enContent}</p>
                          <p className="text-metadata text-muted-foreground mt-xs">Click to copy</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TableCell>
                  
                  {/* AR Content - Click to copy */}
                  <TableCell className="max-w-[200px]">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => handleCopyContent(caption.content, "ar")}
                          dir="rtl"
                          className={cn(
                            "text-right text-body-sm truncate w-full px-2 py-1 rounded transition-smooth",
                            arContent 
                              ? "hover:bg-primary/10 cursor-pointer" 
                              : "text-muted-foreground/50 cursor-default"
                          )}
                        >
                          {arContent || "—"}
                        </button>
                      </TooltipTrigger>
                      {arContent && (
                        <TooltipContent side="top" className="max-w-sm">
                          <p className="text-body-sm" dir="rtl">{arContent}</p>
                          <p className="text-metadata text-muted-foreground mt-xs">Click to copy</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex flex-wrap gap-xs">
                      {caption.entity?.slice(0, 2).map((e) => (
                        <Badge key={e} variant="secondary" className="text-metadata">
                          {e}
                        </Badge>
                      ))}
                      {caption.entity?.length > 2 && (
                        <Badge variant="secondary" className="text-metadata">
                          +{caption.entity.length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={`text-metadata ${getStatusColor(caption.google_status)}`}>
                      {caption.google_status || "pending"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-body-sm text-muted-foreground">
                      {caption.use_count || 0}
                    </span>
                  </TableCell>
                  
                  {/* Actions - Always visible */}
                  <TableCell>
                    <div className="flex items-center gap-xs">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onEdit(caption)}
                      >
                        <Edit className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-destructive/10"
                        onClick={() => setDeleteConfirmId(caption.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Single Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Caption</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this caption? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={bulkDeleteConfirm} onOpenChange={setBulkDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} Captions</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedIds.size} selected captions? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}