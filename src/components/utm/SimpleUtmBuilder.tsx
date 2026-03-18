import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataCard } from "@/components/layout";
import { Copy, Check, Trash2, Wand2, Building2, GripVertical, ChevronUp, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { useSystemEntities } from "@/hooks/useSystemEntities";
import { useUtmPlatforms } from "@/hooks/useUtmPlatforms";
import { useUtmCampaigns } from "@/hooks/useUtmCampaigns";
import { useCreateUtmLink } from "@/hooks/useUtmLinks";
import { useLpLinks } from "@/hooks/useLpLinks";
import { useLpOrderPreferences, useSaveLpOrderPreferences } from "@/hooks/useLpOrderPreferences";
import {
  calculateUtmMedium,
  formatFullMonthYear2Digit,
  buildUtmUrl,
  generateUtmContent,
} from "@/lib/utmHelpers";
import { CampaignSelect } from "./CampaignSelect";
import { cn } from "@/lib/utils";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface UtmRow {
  id: string;
  lpLinkId: string;
  lpName: string;
  language: string;
  campaign: string;
  platform: string;
  content: string;
  archivedAt: string | null;
}

interface SortableRowProps {
  row: UtmRow & { generatedUrl: string };
  index: number;
  totalRows: number;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onUpdate: (id: string, field: keyof UtmRow, value: string) => void;
  onDelete: (id: string) => void;
  onCopy: (row: UtmRow) => void;
  copiedIds: Set<string>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  platforms: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  campaigns: any[];
}

function SortableRow({
  row,
  index,
  totalRows,
  onMoveUp,
  onMoveDown,
  onUpdate,
  onDelete,
  onCopy,
  copiedIds,
  platforms,
  campaigns,
}: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: row.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const activePlatforms = platforms?.filter((p: any) => p.is_active) || [];

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={cn(
        "transition-smooth",
        row.archivedAt && "bg-success-soft/30",
        isDragging && "bg-muted/50"
      )}
    >
      {/* Drag handle + Order controls */}
      <TableCell className="w-[60px]">
        <div className="flex items-center gap-0.5">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </button>
          <div className="flex flex-col">
            <button
              onClick={() => onMoveUp(row.id)}
              disabled={index === 0}
              className={cn(
                "p-0.5 hover:bg-muted rounded transition-colors",
                index === 0 && "opacity-30 cursor-not-allowed"
              )}
            >
              <ChevronUp className="h-3 w-3 text-muted-foreground" />
            </button>
            <button
              onClick={() => onMoveDown(row.id)}
              disabled={index === totalRows - 1}
              className={cn(
                "p-0.5 hover:bg-muted rounded transition-colors",
                index === totalRows - 1 && "opacity-30 cursor-not-allowed"
              )}
            >
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </button>
          </div>
        </div>
      </TableCell>

      {/* LP Name - Read only, with "New" badge for recently added */}
      <TableCell className="font-medium text-body-sm">
        <div className="flex items-center gap-xs">
          {row.lpName}
          {row.lpCreatedAt && isNewLp(row.lpCreatedAt) && (
            <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 bg-primary/15 text-primary">
              New
            </Badge>
          )}
        </div>
      </TableCell>

      {/* Language dropdown */}
      <TableCell>
        <Select
          value={row.language}
          onValueChange={(v) => onUpdate(row.id, "language", v)}
        >
          <SelectTrigger className="h-8 text-metadata w-[60px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LANGUAGES.map((lang) => (
              <SelectItem key={lang} value={lang}>
                {lang}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>

      {/* Platform dropdown */}
      <TableCell>
        <Select
          value={row.platform}
          onValueChange={(v) => onUpdate(row.id, "platform", v)}
        >
          <SelectTrigger className="h-8 text-metadata">
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {activePlatforms.map((platform: any) => (
              <SelectItem key={platform.id} value={platform.id}>
                {platform.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>

      {/* Campaign with add/edit/delete */}
      <TableCell>
        <CampaignSelect
          value={row.campaign}
          onValueChange={(v) => onUpdate(row.id, "campaign", v)}
          className="w-full"
        />
      </TableCell>

      {/* Content - free text */}
      <TableCell>
        <Input
          value={row.content}
          onChange={(e) => onUpdate(row.id, "content", e.target.value)}
          placeholder="Auto"
          className="h-8 text-metadata"
        />
      </TableCell>

      {/* Generated UTM URL */}
      <TableCell className="max-w-0">
        <code className="text-metadata text-muted-foreground block truncate">
          {row.generatedUrl || "—"}
        </code>
      </TableCell>

      {/* Copy button */}
      <TableCell>
        <div className="flex items-center justify-end gap-xs">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onCopy(row)}
            disabled={!row.generatedUrl}
          >
            {copiedIds.has(row.id) ? (
              <Check className="h-4 w-4 text-success-text" />
            ) : row.archivedAt ? (
              <div className="relative">
                <Copy className="h-4 w-4" />
                <Check className="h-2.5 w-2.5 absolute -bottom-0.5 -right-0.5 text-success-text" />
              </div>
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive-text hover:text-destructive-text"
            onClick={() => onDelete(row.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

const LANGUAGES = ["EN", "AR"];

export function SimpleUtmBuilder() {
  const [selectedEntityId, setSelectedEntityId] = useState<string>("");
  const [rows, setRows] = useState<UtmRow[]>([]);
  const [copiedIds, setCopiedIds] = useState<Set<string>>(new Set());

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Data hooks
  const { data: entities } = useSystemEntities();
  const { data: platforms } = useUtmPlatforms();
  const { data: campaigns } = useUtmCampaigns();
  const { data: lpLinks } = useLpLinks({ isActive: true });
  const createUtmLink = useCreateUtmLink();
  
  // LP order preferences
  const { data: orderPreferences } = useLpOrderPreferences(selectedEntityId || null);
  const saveLpOrder = useSaveLpOrderPreferences();

  // All active LP links (already sorted by display_order from hook)
  const allLpLinks = lpLinks || [];

  // Get entity info
  const selectedEntity = useMemo(() => {
    return entities?.find(e => e.id === selectedEntityId);
  }, [entities, selectedEntityId]);

  const getEntityEmoji = (code: string | undefined) => {
    const emojiMap: Record<string, string> = {
      JO: "🇯🇴",
      AE: "🇦🇪",
      SA: "🇸🇦",
      KW: "🇰🇼",
      BH: "🇧🇭",
      OM: "🇴🇲",
      QA: "🇶🇦",
      EG: "🇪🇬",
      LB: "🇱🇧",
      MU: "🇲🇺",
    };
    return code ? emojiMap[code] || "🌍" : "🌍";
  };

  // Use refs to track campaigns and platforms without triggering re-renders
  const campaignsRef = useRef(campaigns);
  const platformsRef = useRef(platforms);
  
  // Keep refs updated
  useEffect(() => {
    campaignsRef.current = campaigns;
  }, [campaigns]);
  
  useEffect(() => {
    platformsRef.current = platforms;
  }, [platforms]);

  // Initialize rows from LPs when entity changes, applying saved order
  // NOTE: campaigns and platforms are intentionally NOT in dependencies to prevent
  // re-initialization when new campaigns/platforms are added
  useEffect(() => {
    const currentCampaigns = campaignsRef.current;
    const currentPlatforms = platformsRef.current;
    
    if (selectedEntityId && allLpLinks.length > 0 && currentCampaigns && currentPlatforms) {
      // Create rows from all LPs
      let orderedLpLinks = [...allLpLinks];
      
      // Apply saved order if available
      if (orderPreferences?.lp_order && orderPreferences.lp_order.length > 0) {
        const savedOrder = orderPreferences.lp_order;
        orderedLpLinks = orderedLpLinks.sort((a, b) => {
          const indexA = savedOrder.indexOf(a.id);
          const indexB = savedOrder.indexOf(b.id);
          // If not in saved order, put at end
          if (indexA === -1 && indexB === -1) return 0;
          if (indexA === -1) return 1;
          if (indexB === -1) return -1;
          return indexA - indexB;
        });
      }
      
      const newRows: UtmRow[] = orderedLpLinks.map((lp) => ({
        id: crypto.randomUUID(),
        lpLinkId: lp.id,
        lpName: lp.name || "Unnamed",
        language: "EN",
        campaign: currentCampaigns[0]?.id || "",
        platform: currentPlatforms[0]?.id || "",
        content: "",
        archivedAt: null,
      }));
      setRows(newRows);
    } else if (!selectedEntityId) {
      setRows([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEntityId, allLpLinks.length, orderPreferences]);

  // Generate UTM URL for a row
  const generateRowUrl = useCallback(
    (row: UtmRow): string => {
      const lpLink = lpLinks?.find((lp) => lp.id === row.lpLinkId);
      if (!lpLink) return "";

      const platformData = platforms?.find((p) => p.id === row.platform);
      const campaignData = campaigns?.find((c) => c.id === row.campaign);
      const platformName = platformData?.name || "";
      const campaignName = campaignData?.name || "";

      // Get base URL from LP link and build with language
      let lpUrl = lpLink.base_url;
      // Use website_param (e.g., "kw" for Kuwait) from config, fallback to code
      const entityCode = selectedEntity?.website_param?.toLowerCase() || selectedEntity?.code?.toLowerCase() || lpLink.entity?.website_param?.toLowerCase() || lpLink.entity?.code?.toLowerCase() || "";
      
      try {
        const urlObj = new URL(lpUrl);
        const pathParts = urlObj.pathname.split("/").filter(Boolean);
        
        // If dynamic LP, add lang param
        if (lpLink.lp_type === "dynamic") {
          urlObj.searchParams.set("lang", row.language.toLowerCase());
          lpUrl = urlObj.toString();
        } else {
          // For static LP, insert language and entity code at beginning of path
          urlObj.pathname = `/${row.language.toLowerCase()}/${entityCode}/${pathParts.join("/")}`;
          lpUrl = urlObj.toString();
        }
      } catch {
        // Fallback if URL parsing fails
      }

      // Helper to capitalize first letter
      const toTitleCase = (str: string) => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
      
      const utmSource = platformName.toLowerCase();
      const utmMedium = platformData?.utm_medium || calculateUtmMedium(platformName);
      // Format: Facebook_Gold_January26 (Title Case)
      const formattedPlatform = toTitleCase(platformName);
      const formattedCampaign = campaignName.split(/[\s_-]+/).map(toTitleCase).join('');
      const utmCampaign = `${formattedPlatform}_${formattedCampaign}_${formatFullMonthYear2Digit()}`;
      const utmContent = row.content || generateUtmContent(lpUrl, campaignName);

      return buildUtmUrl({
        baseUrl: lpUrl,
        utmSource,
        utmMedium,
        utmCampaign,
        utmContent,
      });
    },
    [lpLinks, platforms, campaigns, selectedEntity]
  );

  // Update a row field
  const updateRow = useCallback((id: string, field: keyof UtmRow, value: string) => {
    setRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  }, []);

  // Delete a row
  const deleteRow = useCallback((id: string) => {
    setRows((prev) => prev.filter((row) => row.id !== id));
  }, []);

  // Copy URL and archive (only once)
  const handleCopy = useCallback(
    async (row: UtmRow) => {
      const url = generateRowUrl(row);
      if (!url) {
        toast.error("Please select an LP link first");
        return;
      }

      await navigator.clipboard.writeText(url);
      setCopiedIds((prev) => new Set(prev).add(row.id));
      setTimeout(() => {
        setCopiedIds((prev) => {
          const next = new Set(prev);
          next.delete(row.id);
          return next;
        });
      }, 2000);

      // Archive only if not already archived
      if (!row.archivedAt) {
        const lpLink = lpLinks?.find((lp) => lp.id === row.lpLinkId);
        const platformData = platforms?.find((p) => p.id === row.platform);
        const campaignData = campaigns?.find((c) => c.id === row.campaign);
        const platformName = platformData?.name || "";
        const campaignName = campaignData?.name || "";
        const entityName = selectedEntity?.name || lpLink?.entity?.name || "";

        // Helper to capitalize first letter
        const toTitleCase = (str: string) => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
        const formattedPlatform = toTitleCase(platformName);
        const formattedCampaign = campaignName.split(/[\s_-]+/).map(toTitleCase).join('');

        try {
          await createUtmLink.mutateAsync({
            name: `${entityName}_${campaignName}_${row.language}`,
            base_url: lpLink?.base_url || "",
            full_url: url,
            utm_source: platformName.toLowerCase(),
            utm_medium: platformData?.utm_medium || calculateUtmMedium(platformName),
            utm_campaign: `${formattedPlatform}_${formattedCampaign}_${formatFullMonthYear2Digit()}`,
            utm_content: row.content || null,
            utm_term: null,
            entity: entityName ? [entityName] : [],
            platform: platformName,
            status: "active",
          });

          setRows((prev) =>
            prev.map((r) =>
              r.id === row.id ? { ...r, archivedAt: new Date().toISOString() } : r
            )
          );
          toast.success("Link copied & saved to archive!");
        } catch (error) {
          toast.success("Link copied!");
          // Silently fail on archive save - link was already copied
        }
      } else {
        toast.success("Link copied!");
      }
    },
    [generateRowUrl, lpLinks, platforms, campaigns, createUtmLink, selectedEntity]
  );

  // Memoized rows with generated URLs
  const rowsWithUrls = useMemo(() => {
    return rows.map((row) => ({
      ...row,
      generatedUrl: generateRowUrl(row),
    }));
  }, [rows, generateRowUrl]);

  const activePlatforms = platforms?.filter((p) => p.is_active) || [];

  // Handle entity change
  const handleEntityChange = (entityId: string) => {
    setSelectedEntityId(entityId);
  };

  // Save order to database
  const saveOrderToDb = useCallback((newRows: UtmRow[]) => {
    if (!selectedEntityId) return;
    const lpOrder = newRows.map(r => r.lpLinkId);
    saveLpOrder.mutate({ entityId: selectedEntityId, lpOrder });
  }, [selectedEntityId, saveLpOrder]);

  // Drag and drop handler
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setRows((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const newItems = arrayMove(items, oldIndex, newIndex);
        // Save order after reordering
        saveOrderToDb(newItems);
        return newItems;
      });
    }
  }, [saveOrderToDb]);

  // Move row up
  const moveRowUp = useCallback((id: string) => {
    setRows((items) => {
      const index = items.findIndex((item) => item.id === id);
      if (index > 0) {
        const newItems = arrayMove(items, index, index - 1);
        saveOrderToDb(newItems);
        return newItems;
      }
      return items;
    });
  }, [saveOrderToDb]);

  // Move row down
  const moveRowDown = useCallback((id: string) => {
    setRows((items) => {
      const index = items.findIndex((item) => item.id === id);
      if (index < items.length - 1) {
        const newItems = arrayMove(items, index, index + 1);
        saveOrderToDb(newItems);
        return newItems;
      }
      return items;
    });
  }, [saveOrderToDb]);

  return (
    <DataCard>
      <div className="space-y-lg">
        {/* Header with Entity Selector */}
        <div className="flex items-center justify-between gap-lg">
          <div className="flex-1">
            <Label className="text-heading-sm font-semibold">UTM Link Builder</Label>
            <p className="text-metadata text-muted-foreground mt-xs">
              Select an entity to generate UTM links for landing pages
            </p>
          </div>

          {/* Entity Selector */}
          <div className="flex items-center gap-sm">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedEntityId} onValueChange={handleEntityChange}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select Entity" />
              </SelectTrigger>
              <SelectContent>
                {entities?.map((entity) => (
                  <SelectItem key={entity.id} value={entity.id}>
                    {getEntityEmoji(entity.code)} {entity.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* No entity selected state */}
        {!selectedEntityId && (
          <div className="text-center py-2xl text-muted-foreground border border-dashed rounded-lg">
            <Building2 className="h-12 w-12 mx-auto mb-md opacity-50" />
            <p className="text-heading-sm font-medium mb-xs">Select an Entity</p>
            <p className="text-body-sm">
              Choose an entity above to start building UTM links
            </p>
          </div>
        )}

        {/* No LPs in system */}
        {selectedEntityId && allLpLinks.length === 0 && (
          <div className="text-center py-2xl text-muted-foreground border border-dashed rounded-lg">
            <Wand2 className="h-12 w-12 mx-auto mb-md opacity-50" />
            <p className="text-heading-sm font-medium mb-xs">No Landing Pages</p>
            <p className="text-body-sm mb-md">
              No landing pages configured. Add some in the Config tab.
            </p>
          </div>
        )}

        {/* Entity selected with LPs available - show unified table */}
        {selectedEntityId && allLpLinks.length > 0 && rows.length > 0 && (
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="px-md py-sm bg-muted/50 border-b border-border">
              <Label className="text-metadata font-medium text-muted-foreground">
                {getEntityEmoji(selectedEntity?.code)} {selectedEntity?.name} • {rows.length} Landing Pages
              </Label>
            </div>
            <div>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="w-[50px]">Order</TableHead>
                      <TableHead className="w-[15%]">LP Name</TableHead>
                      <TableHead className="w-[60px]">Lang</TableHead>
                      <TableHead className="w-[12%]">Platform</TableHead>
                      <TableHead className="w-[15%]">Campaign</TableHead>
                      <TableHead className="w-[10%]">Content</TableHead>
                      <TableHead>Generated UTM</TableHead>
                      <TableHead className="w-[70px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <SortableContext
                      items={rowsWithUrls.map((r) => r.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {rowsWithUrls.map((row, index) => (
                        <SortableRow
                          key={row.id}
                          row={row}
                          index={index}
                          totalRows={rowsWithUrls.length}
                          onMoveUp={moveRowUp}
                          onMoveDown={moveRowDown}
                          onUpdate={updateRow}
                          onDelete={deleteRow}
                          onCopy={handleCopy}
                          copiedIds={copiedIds}
                          platforms={platforms || []}
                          campaigns={campaigns || []}
                        />
                      ))}
                    </SortableContext>
                  </TableBody>
                </Table>
              </DndContext>
            </div>
          </div>
        )}
      </div>
    </DataCard>
  );
}
