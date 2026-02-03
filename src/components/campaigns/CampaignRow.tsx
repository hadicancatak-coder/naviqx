import { useState, memo } from "react";
import { ExternalLink, Copy, Trash2, Plus, Check, ImageIcon } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ENTITY_STATUS_CONFIG, ENTITY_TRACKING_STATUSES, EntityTrackingStatus } from "@/domain/campaigns";
import { useSystemEntities } from "@/hooks/useSystemEntities";
import { useCampaignVersions } from "@/hooks/useCampaignVersions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface CampaignRowData {
  id: string;
  name: string;
  landing_page: string | null;
  campaign_type: string | null;
  description: string | null;
  entities: Array<{
    trackingId: string;
    entity: string;
    status: EntityTrackingStatus;
  }>;
  versionCount: number;
}

interface CampaignRowProps {
  campaign: CampaignRowData;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onUpdateName: (id: string, name: string) => void;
  onUpdateLandingPage: (id: string, lp: string) => void;
  onAddToEntity: (campaignId: string, entity: string, status: EntityTrackingStatus) => void;
  onRemoveFromEntity: (trackingId: string) => void;
  onUpdateEntityStatus: (trackingId: string, status: EntityTrackingStatus) => void;
  onDelete: (id: string) => void;
  onOpenDetail: (campaign: CampaignRowData) => void;
}

// Separate component for version thumbnail to optimize re-renders
const VersionThumbnail = memo(function VersionThumbnail({ campaignId }: { campaignId: string }) {
  const { useVersions } = useCampaignVersions();
  const { data: versions = [] } = useVersions(campaignId);
  const latestVersion = versions[0];

  if (!latestVersion?.image_url && !latestVersion?.asset_link) {
    return (
      <div className="w-10 h-10 rounded bg-muted flex items-center justify-center flex-shrink-0">
        <ImageIcon className="size-4 text-muted-foreground" />
      </div>
    );
  }

  return (
    <img
      src={latestVersion.image_url || latestVersion.asset_link || ""}
      alt=""
      className="w-10 h-10 rounded object-cover flex-shrink-0"
      onError={(e) => {
        (e.target as HTMLImageElement).src = "";
        (e.target as HTMLImageElement).className = "hidden";
      }}
    />
  );
});

export function CampaignRow({
  campaign,
  isSelected,
  onSelect,
  onUpdateName,
  onUpdateLandingPage,
  onAddToEntity,
  onRemoveFromEntity,
  onUpdateEntityStatus,
  onDelete,
  onOpenDetail,
}: CampaignRowProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingLP, setIsEditingLP] = useState(false);
  const [editName, setEditName] = useState(campaign.name);
  const [editLP, setEditLP] = useState(campaign.landing_page || "");
  const [entityPopoverOpen, setEntityPopoverOpen] = useState(false);
  const [copiedLP, setCopiedLP] = useState(false);

  const { data: allEntities = [] } = useSystemEntities();

  // Handle row click - open detail sheet unless clicking interactive elements
  const handleRowClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const isInteractive = target.closest(
      'input, button, [role="button"], [role="checkbox"], a, [data-radix-collection-item]'
    );
    if (isInteractive) return;
    onOpenDetail(campaign);
  };

  const handleNameSave = () => {
    if (editName.trim() && editName !== campaign.name) {
      onUpdateName(campaign.id, editName.trim());
    }
    setIsEditingName(false);
  };

  const handleLPSave = () => {
    if (editLP !== campaign.landing_page) {
      onUpdateLandingPage(campaign.id, editLP.trim());
    }
    setIsEditingLP(false);
  };

  const copyLP = () => {
    if (campaign.landing_page) {
      navigator.clipboard.writeText(campaign.landing_page);
      setCopiedLP(true);
      toast.success("Link copied");
      setTimeout(() => setCopiedLP(false), 2000);
    }
  };

  const openLP = () => {
    if (campaign.landing_page) {
      try {
        const url = campaign.landing_page.startsWith("http")
          ? campaign.landing_page
          : `https://${campaign.landing_page}`;
        window.open(url, "_blank");
      } catch {
        toast.error("Invalid URL");
      }
    }
  };

  // Entities not yet assigned
  const availableEntities = allEntities.filter(
    (e) => !campaign.entities.some((ce) => ce.entity === e.name)
  );

  return (
    <tr
      onClick={handleRowClick}
      className={cn(
        "border-b border-border transition-smooth cursor-pointer",
        isSelected && "bg-primary/5",
        "hover:bg-card-hover"
      )}
    >
        {/* Checkbox */}
        <td className="p-sm w-10">
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onSelect(campaign.id)}
          />
        </td>

      {/* Thumbnail + Name */}
      <td className="p-sm">
        <div className="flex items-center gap-sm">
          <VersionThumbnail campaignId={campaign.id} />
          {isEditingName ? (
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleNameSave}
              onKeyDown={(e) => e.key === "Enter" && handleNameSave()}
              autoFocus
              className="h-8 max-w-[200px]"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span
              className="font-medium cursor-pointer hover:text-primary transition-colors line-clamp-1"
              onClick={(e) => {
                e.stopPropagation();
                setIsEditingName(true);
              }}
              title="Click to edit"
            >
              {campaign.name}
            </span>
          )}
        </div>
      </td>

        {/* Landing Page */}
        <td className="p-sm max-w-[200px]">
          {isEditingLP ? (
            <Input
              value={editLP}
              onChange={(e) => setEditLP(e.target.value)}
              onBlur={handleLPSave}
              onKeyDown={(e) => e.key === "Enter" && handleLPSave()}
              autoFocus
              className="h-8"
              placeholder="https://..."
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <div className="flex items-center gap-xs">
              <span
                className="text-body-sm text-muted-foreground truncate max-w-[150px] cursor-pointer hover:text-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditingLP(true);
                }}
                title={campaign.landing_page || "Click to add"}
              >
                {campaign.landing_page ? (
                  (() => {
                    try {
                      return new URL(campaign.landing_page).hostname;
                    } catch {
                      return campaign.landing_page.slice(0, 25);
                    }
                  })()
                ) : (
                  <span className="italic">Add LP</span>
                )}
              </span>
              {campaign.landing_page && (
                <>
                  <Button variant="ghost" size="icon" className="size-6" onClick={copyLP}>
                    {copiedLP ? <Check className="size-3 text-success" /> : <Copy className="size-3" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="size-6" onClick={openLP}>
                    <ExternalLink className="size-3" />
                  </Button>
                </>
              )}
            </div>
          )}
        </td>

        {/* Entities */}
        <td className="p-sm">
          <div className="flex items-center gap-xs flex-wrap">
            {campaign.entities.map((e) => {
              const config = ENTITY_STATUS_CONFIG[e.status] || ENTITY_STATUS_CONFIG.Draft;
              return (
                <Popover key={e.trackingId}>
                  <PopoverTrigger asChild>
                    <Badge
                      variant="outline"
                      className={cn(
                        "cursor-pointer text-[10px] hover:ring-1 hover:ring-primary/50",
                        config.bgColor
                      )}
                    >
                      {e.entity}
                      <span className={cn("ml-1", config.color)}>• {e.status}</span>
                    </Badge>
                  </PopoverTrigger>
                  <PopoverContent className="w-48 p-sm" align="start">
                    <div className="space-y-sm">
                      <Select
                        value={e.status}
                        onValueChange={(v) => onUpdateEntityStatus(e.trackingId, v as EntityTrackingStatus)}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ENTITY_TRACKING_STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-destructive hover:text-destructive"
                        onClick={() => onRemoveFromEntity(e.trackingId)}
                      >
                        <Trash2 className="size-3 mr-1" />
                        Remove
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              );
            })}

            {/* Add to entity */}
            {availableEntities.length > 0 && (
              <Popover open={entityPopoverOpen} onOpenChange={setEntityPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-6">
                    <Plus className="size-3" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-sm" align="start">
                  <div className="space-y-xs">
                    {availableEntities.map((entity) => (
                      <Button
                        key={entity.name}
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => {
                          onAddToEntity(campaign.id, entity.name, "Draft");
                          setEntityPopoverOpen(false);
                        }}
                      >
                        {entity.emoji} {entity.name}
                      </Button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
        </td>

        {/* Versions Count */}
        <td className="p-sm">
          <Badge variant="secondary" className="text-[10px]">
            {campaign.versionCount}
          </Badge>
        </td>

        {/* Actions */}
        <td className="p-sm">
          <div className="flex items-center gap-xs">
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-destructive hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(campaign.id);
              }}
            >
              <Trash2 className="size-3" />
            </Button>
          </div>
        </td>
    </tr>
  );
}
