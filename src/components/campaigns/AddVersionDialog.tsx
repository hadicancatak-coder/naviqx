import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCampaignVersions } from "@/hooks/useCampaignVersions";

interface AddVersionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  campaignName: string;
}

export function AddVersionDialog({
  open,
  onOpenChange,
  campaignId,
  campaignName,
}: AddVersionDialogProps) {
  const [notes, setNotes] = useState("");
  const [assetLink, setAssetLink] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const { createVersion } = useCampaignVersions();

  const handleSubmit = async () => {
    if (!notes.trim() && !assetLink.trim() && !imageUrl.trim()) {
      return;
    }

    await createVersion.mutateAsync({
      campaignId,
      name: campaignName,
      versionNotes: notes.trim() || undefined,
      assetLink: assetLink.trim() || undefined,
      imageUrl: imageUrl.trim() || undefined,
    });

    setNotes("");
    setAssetLink("");
    setImageUrl("");
    onOpenChange(false);
  };

  const handleClose = () => {
    setNotes("");
    setAssetLink("");
    setImageUrl("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Version</DialogTitle>
        </DialogHeader>

        <div className="space-y-md py-md">
          <div className="space-y-sm">
            <Label htmlFor="notes">Version Notes</Label>
            <Textarea
              id="notes"
              placeholder="Describe this version..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[80px]"
            />
          </div>

          <div className="space-y-sm">
            <Label htmlFor="asset-link">Asset Link (optional)</Label>
            <Input
              id="asset-link"
              placeholder="https://drive.google.com/..."
              value={assetLink}
              onChange={(e) => setAssetLink(e.target.value)}
            />
          </div>

          <div className="space-y-sm">
            <Label htmlFor="image-url">Image URL (optional)</Label>
            <Input
              id="image-url"
              placeholder="https://..."
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={(!notes.trim() && !assetLink.trim() && !imageUrl.trim()) || createVersion.isPending}
          >
            {createVersion.isPending ? "Creating..." : "Create Version"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
