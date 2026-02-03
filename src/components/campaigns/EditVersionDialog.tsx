import { useState, useEffect } from "react";
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
import { CampaignVersion, useCampaignVersions } from "@/hooks/useCampaignVersions";

interface EditVersionDialogProps {
  version: CampaignVersion | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditVersionDialog({
  version,
  open,
  onOpenChange,
}: EditVersionDialogProps) {
  const [notes, setNotes] = useState("");
  const [description, setDescription] = useState("");
  const [assetLink, setAssetLink] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const { updateVersion } = useCampaignVersions();

  useEffect(() => {
    if (version) {
      setNotes(version.version_notes || "");
      setDescription(version.description || "");
      setAssetLink(version.asset_link || "");
    }
  }, [version]);

  const handleSave = async () => {
    if (!version) return;

    setIsSaving(true);
    try {
      await updateVersion.mutateAsync({
        versionId: version.id,
        versionNotes: notes.trim() || undefined,
        description: description.trim() || undefined,
        assetLink: assetLink.trim() || undefined,
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to update version:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Edit Version {version?.version_number}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-md py-md">
          <div className="space-y-sm">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Version description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-sm">
            <Label htmlFor="notes">Version Notes</Label>
            <Textarea
              id="notes"
              placeholder="Enter version notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-sm">
            <Label htmlFor="assetLink">Asset Link</Label>
            <Input
              id="assetLink"
              placeholder="https://..."
              value={assetLink}
              onChange={(e) => setAssetLink(e.target.value)}
            />
          </div>

          {version?.image_url && (
            <div className="space-y-sm">
              <Label>Current Image</Label>
              <img
                src={version.image_url}
                alt="Version preview"
                className="w-full max-h-32 object-contain rounded-lg border border-border"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
