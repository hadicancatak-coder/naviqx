import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";

interface AdGroup {
  id: string;
  name: string;
}

interface DeleteAdGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  adGroup: AdGroup;
  adsCount: number;
  onSuccess: () => void;
}

export function DeleteAdGroupDialog({ open, onOpenChange, adGroup, adsCount, onSuccess }: DeleteAdGroupDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const handleDelete = async () => {
    if (!confirmed && adsCount > 0) {
      toast.error("Please confirm you understand this will delete all ads");
      return;
    }

    setIsDeleting(true);
    try {
      // Delete all ads first
      if (adsCount > 0) {
        const { error: adsError } = await supabase
          .from('ads')
          .delete()
          .eq('ad_group_id', adGroup.id);

        if (adsError) throw adsError;
      }

      // Then delete the ad group
      const { error } = await supabase
        .from('ad_groups')
        .delete()
        .eq('id', adGroup.id);

      if (error) throw error;

      toast.success(`"${adGroup.name}" and ${adsCount} ad(s) deleted successfully`);
      onSuccess();
      onOpenChange(false);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to delete ad group");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-sm">
            <AlertCircle className="h-5 w-5 text-destructive" />
            Delete Ad Group
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete "{adGroup?.name}"?
            {adsCount > 0 && (
              <span className="block mt-sm font-semibold text-destructive">
                Warning: This will also delete {adsCount} ad(s) in this group.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        
        {adsCount > 0 && (
          <div className="flex items-center space-x-sm py-sm">
            <Checkbox id="confirm-delete" checked={confirmed} onCheckedChange={(checked) => setConfirmed(checked === true)} />
            <Label htmlFor="confirm-delete" className="text-body-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              I understand this will delete {adsCount} ad(s)
            </Label>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isDeleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? "Deleting..." : "Delete Ad Group"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
