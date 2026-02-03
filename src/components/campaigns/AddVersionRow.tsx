import { useState, memo } from "react";
import { Plus, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCampaignVersions } from "@/hooks/useCampaignVersions";
import { toast } from "sonner";

interface AddVersionRowProps {
  campaignId: string;
  campaignName: string;
  onVersionAdded?: () => void;
}

export const AddVersionRow = memo(function AddVersionRow({
  campaignId,
  campaignName,
  onVersionAdded,
}: AddVersionRowProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [notes, setNotes] = useState("");
  const [assetLink, setAssetLink] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const { createVersion } = useCampaignVersions();

  const handleSave = async () => {
    if (!notes.trim() && !assetLink.trim()) {
      toast.error("Please provide version notes or asset link");
      return;
    }

    setIsSaving(true);
    try {
      await createVersion.mutateAsync({
        campaignId,
        name: campaignName,
        versionNotes: notes.trim() || undefined,
        assetLink: assetLink.trim() || undefined,
      });
      setNotes("");
      setAssetLink("");
      setIsAdding(false);
      onVersionAdded?.();
    } catch (error) {
      console.error("Failed to add version:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setNotes("");
    setAssetLink("");
    setIsAdding(false);
  };

  if (!isAdding) {
    return (
      <tr className="bg-muted/10 border-b border-border/50">
        <td className="p-sm w-10"></td>
        <td colSpan={5} className="p-sm">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 pl-md text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              setIsAdding(true);
            }}
          >
            <Plus className="size-3 mr-1" />
            Add Version
          </Button>
        </td>
      </tr>
    );
  }

  return (
    <tr className="bg-muted/10 border-b border-border/50">
      <td className="p-sm w-10"></td>
      <td className="p-sm">
        <div className="flex items-center gap-sm pl-md">
          <span className="text-muted-foreground text-body-sm">└</span>
          <Input
            placeholder="Version notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="h-8 max-w-[200px]"
            autoFocus
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") handleCancel();
            }}
          />
        </div>
      </td>
      <td className="p-sm" colSpan={2}>
        <Input
          placeholder="Asset link (optional)"
          value={assetLink}
          onChange={(e) => setAssetLink(e.target.value)}
          className="h-8 max-w-[250px]"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") handleCancel();
          }}
        />
      </td>
      <td className="p-sm" colSpan={2}>
        <div className="flex items-center gap-xs">
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-success hover:text-success"
            onClick={(e) => {
              e.stopPropagation();
              handleSave();
            }}
            disabled={isSaving}
          >
            <Check className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={(e) => {
              e.stopPropagation();
              handleCancel();
            }}
            disabled={isSaving}
          >
            <X className="size-4" />
          </Button>
        </div>
      </td>
    </tr>
  );
});
