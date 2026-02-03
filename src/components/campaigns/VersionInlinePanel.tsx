import { useState } from "react";
import { Plus, ImageIcon, ExternalLink, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useCampaignVersions } from "@/hooks/useCampaignVersions";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface VersionInlinePanelProps {
  campaignId: string;
  campaignName: string;
  onClose: () => void;
}

export function VersionInlinePanel({ campaignId, campaignName, onClose }: VersionInlinePanelProps) {
  const { useVersions, createVersion } = useCampaignVersions();
  const { data: versions = [], isLoading } = useVersions(campaignId);
  const [showAddVersion, setShowAddVersion] = useState(false);
  const [newVersionNotes, setNewVersionNotes] = useState("");
  const [newAssetLink, setNewAssetLink] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const handleAddVersion = async () => {
    if (!newVersionNotes.trim() && !newAssetLink.trim()) {
      toast.error("Please provide version notes or asset link");
      return;
    }

    setIsAdding(true);
    try {
      await createVersion.mutateAsync({
        campaignId,
        name: campaignName,
        versionNotes: newVersionNotes || undefined,
        assetLink: newAssetLink || undefined,
      });
      setNewVersionNotes("");
      setNewAssetLink("");
      setShowAddVersion(false);
    } catch (error) {
      console.error("Failed to add version:", error);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="bg-muted/30 border-t border-border p-md animate-in slide-in-from-top-2">
      <div className="flex items-center justify-between mb-md">
        <h4 className="text-body-sm font-medium">
          Versions ({versions.length})
        </h4>
        <div className="flex items-center gap-sm">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddVersion(!showAddVersion)}
          >
            <Plus className="size-3" />
            Add Version
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
          >
            <ChevronUp className="size-4" />
          </Button>
        </div>
      </div>

      {/* Add Version Form */}
      {showAddVersion && (
        <div className="mb-md p-sm bg-card rounded-lg border border-border space-y-sm">
          <Input
            placeholder="Version notes..."
            value={newVersionNotes}
            onChange={(e) => setNewVersionNotes(e.target.value)}
          />
          <Input
            placeholder="Asset link (image URL)"
            value={newAssetLink}
            onChange={(e) => setNewAssetLink(e.target.value)}
          />
          <div className="flex justify-end gap-sm">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowAddVersion(false);
                setNewVersionNotes("");
                setNewAssetLink("");
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleAddVersion}
              disabled={isAdding}
            >
              {isAdding ? "Adding..." : "Add"}
            </Button>
          </div>
        </div>
      )}

      {/* Versions Grid */}
      {isLoading ? (
        <div className="text-center py-md text-muted-foreground">Loading...</div>
      ) : versions.length === 0 ? (
        <div className="text-center py-md text-muted-foreground">
          No versions yet. Add the first version above.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-sm">
          {versions.map((version) => (
            <div
              key={version.id}
              className="bg-card rounded-lg border border-border overflow-hidden hover:border-primary/50 transition-smooth"
            >
              {/* Thumbnail */}
              {version.image_url || version.asset_link ? (
                <img
                  src={version.image_url || version.asset_link || ""}
                  alt={`V${version.version_number}`}
                  className="w-full aspect-video object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <div className="w-full aspect-video bg-muted flex items-center justify-center">
                  <ImageIcon className="size-5 text-muted-foreground" />
                </div>
              )}

              <div className="p-xs">
                <div className="flex items-center justify-between mb-1">
                  <Badge variant="secondary" className="text-[10px]">
                    V{version.version_number}
                  </Badge>
                  {version.asset_link && (
                    <a
                      href={version.asset_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80"
                    >
                      <ExternalLink className="size-3" />
                    </a>
                  )}
                </div>
                {version.version_notes && (
                  <p className="text-[10px] text-muted-foreground line-clamp-2">
                    {version.version_notes}
                  </p>
                )}
                <p className="text-[10px] text-muted-foreground mt-1">
                  {format(new Date(version.created_at), "MMM d")}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
