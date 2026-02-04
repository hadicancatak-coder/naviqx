import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import type { Caption } from "@/pages/CaptionLibrary";
import { cn } from "@/lib/utils";
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

  return (
    <TooltipProvider>
      <div className="relative">
        {selectedIds.size > 0 && (
          <div 
            className="sticky top-0 z-10 flex items-center gap-4 px-4 py-2"
            style={{ 
              background: "rgba(18,18,18,0.38)",
              backdropFilter: "blur(40px) saturate(160%)",
              WebkitBackdropFilter: "blur(40px) saturate(160%)",
              borderBottom: "1px solid rgba(255,255,255,0.04)",
            }}
          >
            <span 
              className="text-sm font-medium"
              style={{ color: "rgba(235,235,235,0.9)" }}
            >
              {selectedIds.size} selected
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setBulkDeleteConfirm(true)}
              className="hover:bg-red-500/15"
              style={{ color: "#ef4444" }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Selected
            </Button>
          </div>
        )}

        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <th className="w-12 p-4 text-left">
                <Checkbox
                  checked={selectedIds.size === captions.length && captions.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
              </th>
              <th 
                className="p-4 text-left text-xs font-medium"
                style={{ color: "rgba(180,180,180,0.6)" }}
              >
                Type
              </th>
              <th 
                className="p-4 text-left text-xs font-medium"
                style={{ color: "rgba(180,180,180,0.6)" }}
              >
                EN Content
              </th>
              <th 
                className="p-4 text-left text-xs font-medium"
                style={{ color: "rgba(180,180,180,0.6)" }}
              >
                AR Content
              </th>
              <th 
                className="p-4 text-left text-xs font-medium"
                style={{ color: "rgba(180,180,180,0.6)" }}
              >
                Entity
              </th>
              <th 
                className="p-4 text-left text-xs font-medium"
                style={{ color: "rgba(180,180,180,0.6)" }}
              >
                Status
              </th>
              <th 
                className="p-4 text-left text-xs font-medium"
                style={{ color: "rgba(180,180,180,0.6)" }}
              >
                Uses
              </th>
              <th 
                className="w-24 p-4 text-left text-xs font-medium"
                style={{ color: "rgba(180,180,180,0.6)" }}
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {captions.map((caption) => {
              const enContent = getContentForDisplay(caption.content, "en");
              const arContent = getContentForDisplay(caption.content, "ar");

              return (
                <tr
                  key={caption.id}
                  className="transition-colors hover:bg-white/04"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                >
                  <td className="p-4">
                    <Checkbox
                      checked={selectedIds.has(caption.id)}
                      onCheckedChange={() => toggleSelect(caption.id)}
                    />
                  </td>
                  <td className="p-4">
                    <span 
                      className="px-2 py-1 text-xs rounded-full capitalize"
                      style={{ 
                        background: "rgba(255,255,255,0.08)",
                        color: "rgba(235,235,235,0.9)",
                      }}
                    >
                      {caption.element_type}
                    </span>
                  </td>
                  
                  {/* EN Content - Click to copy */}
                  <td className="p-4 max-w-[200px]">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => handleCopyContent(caption.content, "en")}
                          className={cn(
                            "text-left text-sm truncate w-full px-2 py-1 rounded-lg transition-all",
                            enContent 
                              ? "hover:bg-white/08 cursor-pointer" 
                              : "cursor-default"
                          )}
                          style={{ 
                            color: enContent ? "rgba(235,235,235,0.9)" : "rgba(180,180,180,0.4)",
                          }}
                        >
                          {enContent || "—"}
                        </button>
                      </TooltipTrigger>
                      {enContent && (
                        <TooltipContent side="top" className="max-w-sm">
                          <p className="text-sm">{enContent}</p>
                          <p className="text-xs text-muted-foreground mt-1">Click to copy</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </td>
                  
                  {/* AR Content - Click to copy */}
                  <td className="p-4 max-w-[200px]">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => handleCopyContent(caption.content, "ar")}
                          dir="rtl"
                          className={cn(
                            "text-right text-sm truncate w-full px-2 py-1 rounded-lg transition-all",
                            arContent 
                              ? "hover:bg-white/08 cursor-pointer" 
                              : "cursor-default"
                          )}
                          style={{ 
                            color: arContent ? "rgba(235,235,235,0.9)" : "rgba(180,180,180,0.4)",
                          }}
                        >
                          {arContent || "—"}
                        </button>
                      </TooltipTrigger>
                      {arContent && (
                        <TooltipContent side="top" className="max-w-sm">
                          <p className="text-sm" dir="rtl">{arContent}</p>
                          <p className="text-xs text-muted-foreground mt-1">Click to copy</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </td>
                  
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1">
                      {caption.entity?.slice(0, 2).map((e) => (
                        <span 
                          key={e} 
                          className="px-2 py-0.5 text-xs rounded-full"
                          style={{ 
                            background: "rgba(255,255,255,0.06)",
                            color: "rgba(235,235,235,0.85)",
                          }}
                        >
                          {e}
                        </span>
                      ))}
                      {caption.entity?.length > 2 && (
                        <span 
                          className="px-2 py-0.5 text-xs rounded-full"
                          style={{ 
                            background: "rgba(255,255,255,0.06)",
                            color: "rgba(180,180,180,0.6)",
                          }}
                        >
                          +{caption.entity.length - 2}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <span 
                      className="px-2 py-0.5 text-xs rounded-full capitalize"
                      style={{ 
                        background: "rgba(255,255,255,0.06)",
                        color: "rgba(180,180,180,0.7)",
                      }}
                    >
                      {caption.google_status || "pending"}
                    </span>
                  </td>
                  <td className="p-4">
                    <span 
                      className="text-sm"
                      style={{ color: "rgba(180,180,180,0.6)" }}
                    >
                      {caption.use_count || 0}
                    </span>
                  </td>
                  
                  {/* Actions */}
                  <td className="p-4">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-white/10"
                        onClick={() => onEdit(caption)}
                      >
                        <Edit className="h-4 w-4" style={{ color: "rgba(180,180,180,0.7)" }} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-red-500/15"
                        onClick={() => setDeleteConfirmId(caption.id)}
                      >
                        <Trash2 className="h-4 w-4" style={{ color: "#ef4444" }} />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
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
