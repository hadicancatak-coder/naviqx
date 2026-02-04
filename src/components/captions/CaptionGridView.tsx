import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Edit, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import type { Caption } from "@/pages/CaptionLibrary";
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

// Apple Liquid Glass styles
const glassStyles = {
  surface: {
    background: "rgba(20,20,20,0.55)",
    backdropFilter: "blur(28px) saturate(140%)",
    border: "1px solid rgba(255,255,255,0.08)",
    boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
    borderRadius: "16px",
  },
  highlight: "linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0))",
};

interface CaptionGridViewProps {
  captions: Caption[];
  onEdit: (caption: Caption) => void;
}

export function CaptionGridView({ captions, onEdit }: CaptionGridViewProps) {
  const queryClient = useQueryClient();
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

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

  const handleToggleFavorite = async (caption: Caption) => {
    const { error } = await supabase
      .from("ad_elements")
      .update({ is_favorite: !caption.is_favorite })
      .eq("id", caption.id);
    
    if (error) {
      toast.error("Failed to update");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["ad-elements"] });
  };

  return (
    <TooltipProvider>
      <div className="grid gap-4 p-4 md:grid-cols-2 lg:grid-cols-3">
        {captions.map((caption) => {
          const enContent = getContentForDisplay(caption.content, "en");
          const arContent = getContentForDisplay(caption.content, "ar");

          return (
            <div 
              key={caption.id} 
              className="relative overflow-hidden transition-all hover:scale-[1.02]"
              style={glassStyles.surface}
            >
              {/* Highlight overlay */}
              <div 
                className="absolute inset-0 pointer-events-none"
                style={{ background: glassStyles.highlight }}
              />
              
              <div className="relative z-10 p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <span 
                    className="px-3 py-1 text-xs font-medium rounded-full capitalize"
                    style={{ 
                      background: "rgba(255,255,255,0.1)",
                      color: "rgba(235,235,235,0.95)",
                    }}
                  >
                    {caption.element_type}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 hover:bg-white/10"
                      onClick={() => handleToggleFavorite(caption)}
                    >
                      <Star 
                        className="h-4 w-4"
                        style={{ 
                          color: caption.is_favorite ? "#fbbf24" : "rgba(180,180,180,0.7)",
                          fill: caption.is_favorite ? "#fbbf24" : "none",
                        }}
                      />
                    </Button>
                  </div>
                </div>

                {/* EN Content - Click to copy */}
                <div className="space-y-1">
                  <span 
                    className="text-xs"
                    style={{ color: "rgba(180,180,180,0.7)" }}
                  >
                    EN
                  </span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => handleCopyContent(caption.content, "en")}
                        className="w-full text-left p-3 rounded-lg transition-all hover:bg-white/10"
                        style={{ 
                          background: "rgba(255,255,255,0.05)",
                        }}
                      >
                        <p 
                          className="text-sm line-clamp-2"
                          style={{ color: enContent ? "rgba(235,235,235,0.95)" : "rgba(180,180,180,0.5)" }}
                        >
                          {enContent || "No EN content"}
                        </p>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Click to copy EN</p>
                    </TooltipContent>
                  </Tooltip>
                </div>

                {/* AR Content - Click to copy */}
                <div className="space-y-1">
                  <span 
                    className="text-xs"
                    style={{ color: "rgba(180,180,180,0.7)" }}
                  >
                    AR
                  </span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => handleCopyContent(caption.content, "ar")}
                        className="w-full text-right p-3 rounded-lg transition-all hover:bg-white/10"
                        style={{ 
                          background: "rgba(255,255,255,0.05)",
                        }}
                        dir="rtl"
                      >
                        <p 
                          className="text-sm line-clamp-2"
                          style={{ color: arContent ? "rgba(235,235,235,0.95)" : "rgba(180,180,180,0.5)" }}
                        >
                          {arContent || "No AR content"}
                        </p>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Click to copy AR</p>
                    </TooltipContent>
                  </Tooltip>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {caption.entity?.map((e) => (
                    <span 
                      key={e} 
                      className="px-2 py-0.5 text-xs rounded-full"
                      style={{ 
                        background: "rgba(255,255,255,0.08)",
                        color: "rgba(235,235,235,0.95)",
                        border: "1px solid rgba(255,255,255,0.1)",
                      }}
                    >
                      {e}
                    </span>
                  ))}
                  {caption.language && (
                    <span 
                      className="px-2 py-0.5 text-xs rounded-full"
                      style={{ 
                        background: "rgba(255,255,255,0.08)",
                        color: "rgba(180,180,180,0.7)",
                      }}
                    >
                      {caption.language}
                    </span>
                  )}
                  <span 
                    className="px-2 py-0.5 text-xs rounded-full capitalize"
                    style={{ 
                      background: "rgba(255,255,255,0.08)",
                      color: "rgba(180,180,180,0.7)",
                    }}
                  >
                    {caption.google_status || "pending"}
                  </span>
                </div>

                <div 
                  className="flex items-center justify-between pt-3"
                  style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <span 
                    className="text-xs"
                    style={{ color: "rgba(180,180,180,0.7)" }}
                  >
                    {caption.use_count || 0} uses
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-white/10"
                      onClick={() => onEdit(caption)}
                    >
                      <Edit className="h-4 w-4" style={{ color: "rgba(235,235,235,0.95)" }} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-red-500/20"
                      onClick={() => setDeleteConfirmId(caption.id)}
                    >
                      <Trash2 className="h-4 w-4" style={{ color: "#ef4444" }} />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Delete Confirmation Dialog */}
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
    </TooltipProvider>
  );
}
