import { useState } from "react";
import { Edit2, Share2, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LpShareDialog } from "./LpShareDialog";
import { LpMap, useUpdateLpMap } from "@/hooks/useLpMaps";
import { cn } from "@/lib/utils";

interface LpMapHeaderProps {
  map: LpMap;
  onRefresh: () => void;
}

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  review: "bg-warning-soft text-warning-text",
  approved: "bg-success-soft text-success-text",
  live: "bg-primary/20 text-primary",
};

export const LpMapHeader = ({ map, onRefresh }: LpMapHeaderProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(map.name);
  const [showShareDialog, setShowShareDialog] = useState(false);

  const updateMap = useUpdateLpMap();

  const handleSave = async () => {
    if (!name.trim()) return;
    await updateMap.mutateAsync({ id: map.id, name: name.trim() });
    setIsEditing(false);
    onRefresh();
  };

  const handleCancel = () => {
    setName(map.name);
    setIsEditing(false);
  };

  const handleStatusChange = async (status: string) => {
    await updateMap.mutateAsync({ id: map.id, status });
    onRefresh();
  };

  return (
    <div className="p-4 border-b border-border bg-card">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {isEditing ? (
            <div className="flex items-center gap-2 flex-1">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-9 text-lg font-semibold"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSave();
                  if (e.key === "Escape") handleCancel();
                }}
              />
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleSave}>
                <Check className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleCancel}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-semibold truncate">{map.name}</h2>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 opacity-50 hover:opacity-100"
                onClick={() => setIsEditing(true)}
              >
                <Edit2 className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Select value={map.status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-28 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="review">Review</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="live">Live</SelectItem>
            </SelectContent>
          </Select>

          {map.entity && (
            <Badge variant="outline" className="text-xs">
              {map.entity.name}
            </Badge>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowShareDialog(true)}
          >
            <Share2 className="h-4 w-4 mr-1" />
            Share
          </Button>
        </div>
      </div>

      {map.description && (
        <p className="mt-2 text-sm text-muted-foreground">{map.description}</p>
      )}

      <LpShareDialog
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
        map={map}
        onRefresh={onRefresh}
      />
    </div>
  );
};
