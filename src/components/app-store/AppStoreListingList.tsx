import { useState } from "react";
import { Plus, Apple, Play, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AppStoreListing, StoreType } from "@/domain/app-store";

interface Props {
  listings: AppStoreListing[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreate: (name: string, storeType: StoreType) => void;
  onDelete: (id: string) => void;
}

export function AppStoreListingList({ listings, selectedId, onSelect, onCreate, onDelete }: Props) {
  const [newName, setNewName] = useState("");
  const [newStore, setNewStore] = useState<StoreType>("apple");

  const handleCreate = () => {
    if (!newName.trim()) return;
    onCreate(newName.trim(), newStore);
    setNewName("");
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-sm border-b border-border space-y-sm">
        <h3 className="text-heading-sm font-semibold text-foreground">Listings</h3>
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New listing name…"
          className="text-body-sm"
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
        />
        <div className="flex gap-xs">
          <Button
            size="sm"
            variant={newStore === "apple" ? "default" : "outline"}
            className="flex-1 text-metadata"
            onClick={() => setNewStore("apple")}
          >
            <Apple className="h-3.5 w-3.5 mr-1" /> Apple
          </Button>
          <Button
            size="sm"
            variant={newStore === "google_play" ? "default" : "outline"}
            className="flex-1 text-metadata"
            onClick={() => setNewStore("google_play")}
          >
            <Play className="h-3.5 w-3.5 mr-1" /> Play
          </Button>
        </div>
        <Button size="sm" className="w-full" onClick={handleCreate} disabled={!newName.trim()}>
          <Plus className="h-4 w-4 mr-1" /> Create
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-xs space-y-xs">
        {listings.map((l) => (
          <div
            key={l.id}
            onClick={() => onSelect(l.id)}
            className={cn(
              "group flex items-center justify-between p-sm rounded-lg cursor-pointer transition-smooth",
              selectedId === l.id
                ? "bg-primary/10 border border-primary/30"
                : "hover:bg-card-hover border border-transparent",
            )}
          >
            <div className="flex-1 min-w-0">
              <p className="text-body-sm font-medium text-foreground truncate">{l.name}</p>
              <div className="flex items-center gap-xs mt-xs">
                <Badge variant="outline" className="text-metadata px-1.5 py-0">
                  {l.store_type === "apple" ? "Apple" : "Play"}
                </Badge>
                <Badge variant="outline" className="text-metadata px-1.5 py-0 uppercase">
                  {l.locale}
                </Badge>
              </div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(l.id); }}
              className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-smooth p-1"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {listings.length === 0 && (
          <p className="text-body-sm text-muted-foreground text-center py-xl">No listings yet</p>
        )}
      </div>
    </div>
  );
}
