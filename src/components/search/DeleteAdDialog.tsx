import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";
import { logger } from "@/lib/logger";
import { useQueryClient } from "@tanstack/react-query";

interface Ad {
  id?: string;
  name: string;
  ad_group_id?: string;
}

interface DeleteAdDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ad: Ad | null;
  onSuccess: () => void;
}

export function DeleteAdDialog({ open, onOpenChange, ad, onSuccess }: DeleteAdDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const queryClient = useQueryClient();

  const handleDelete = async () => {
    // Defensive checks
    if (!ad || !ad.id) {
      toast.error("Invalid ad data. Cannot delete.");
      logger.error("DeleteAdDialog: Invalid ad object", ad);
      return;
    }

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('ads')
        .delete()
        .eq('id', ad.id);

      if (error) {
        logger.error("Delete error from Supabase:", error);
        throw error;
      }

      // Invalidate queries to refresh the UI
      await queryClient.invalidateQueries({ queryKey: ['ads'] });
      await queryClient.invalidateQueries({ queryKey: ['ad-campaigns'] });
      await queryClient.invalidateQueries({ queryKey: ['ad-groups'] });

      toast.success(`"${ad.name}" deleted successfully`);
      onSuccess();
      onOpenChange(false);
    } catch (error: unknown) {
      logger.error("Delete ad error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to delete ad. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-xs">
            <AlertCircle className="h-5 w-5 text-destructive" />
            Delete Ad
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete "{ad?.name}"? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isDeleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? "Deleting..." : "Delete Ad"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
