import { memo } from "react";
import { Pencil, Trash2, ImageIcon, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CampaignVersion } from "@/hooks/useCampaignVersions";
import { format } from "date-fns";

interface VersionSubRowProps {
  version: CampaignVersion;
  onEdit: (version: CampaignVersion) => void;
  onDelete: (versionId: string) => void;
}

export const VersionSubRow = memo(function VersionSubRow({
  version,
  onEdit,
  onDelete,
}: VersionSubRowProps) {
  const imageUrl = version.image_url || version.asset_link;

  return (
    <tr className="bg-muted/20 border-b border-border/50 hover:bg-muted/30 transition-smooth">
      {/* Empty checkbox column */}
      <td className="p-sm w-10"></td>

      {/* Version info with indent */}
      <td className="p-sm">
        <div className="flex items-center gap-sm pl-md">
          <span className="text-muted-foreground text-body-sm">└</span>
          <Badge variant="outline" className="text-[10px] shrink-0">
            V{version.version_number}
          </Badge>
          <span className="text-body-sm text-muted-foreground truncate max-w-[200px]">
            {version.version_notes || "No notes"}
          </span>
        </div>
      </td>

      {/* Thumbnail */}
      <td className="p-sm">
        <div className="flex items-center gap-xs">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={`V${version.version_number}`}
              className="w-10 h-10 rounded object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
              <ImageIcon className="size-4 text-muted-foreground" />
            </div>
          )}
          {version.asset_link && (
            <a
              href={version.asset_link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-primary/80"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="size-3" />
            </a>
          )}
        </div>
      </td>

      {/* Creator */}
      <td className="p-sm">
        <span className="text-body-sm text-muted-foreground">
          {version.creator_name || "Unknown"}
        </span>
      </td>

      {/* Date */}
      <td className="p-sm">
        <span className="text-body-sm text-muted-foreground">
          {format(new Date(version.created_at), "MMM d, yyyy")}
        </span>
      </td>

      {/* Actions */}
      <td className="p-sm">
        <div className="flex items-center gap-xs">
          <Button
            variant="ghost"
            size="icon"
            className="size-6"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(version);
            }}
          >
            <Pencil className="size-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-6 text-destructive hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(version.id);
            }}
          >
            <Trash2 className="size-3" />
          </Button>
        </div>
      </td>
    </tr>
  );
});
