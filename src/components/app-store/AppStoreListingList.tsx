import { useState } from "react";
import { Plus, Apple, Play, Trash2, Search, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { AppStoreListing, StoreType, ListingStatus } from "@/domain/app-store";
import { formatDistanceToNow } from "date-fns";

interface Props {
  listings: AppStoreListing[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreate: (name: string, storeType: StoreType) => void;
  onDelete: (id: string) => void;
  isCreating?: boolean;
}

const STATUS_CONFIG: Record<ListingStatus, { label: string; className: string }> = {
  draft: { label: "Draft", className: "status-neutral" },
  ready_for_review: { label: "Review", className: "status-info" },
  approved: { label: "Approved", className: "status-success" },
  needs_changes: { label: "Changes", className: "status-warning" },
  live: { label: "Live", className: "status-cyan" },
};

export function AppStoreListingList({
  listings,
  selectedId,
  onSelect,
  onCreate,
  onDelete,
  isCreating = false,
}: Props) {
  const [newName, setNewName] = useState("");
  const [newStore, setNewStore] = useState<StoreType>("apple");
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState("");

  const handleCreate = () => {
    const fallbackName = `${newStore === "apple" ? "Apple" : "Play"} Listing ${listings.length + 1}`;
    const name = newName.trim() || fallbackName;
    onCreate(name, newStore);
    setNewName("");
    setCreateOpen(false);
  };

  const filtered = search.trim()
    ? listings.filter((l) => l.name.toLowerCase().includes(search.toLowerCase()))
    : listings;

  return (
    <div className="flex flex-col h-full">
      <div className="p-sm border-b border-border space-y-sm">
        {/* New Listing button */}
        <Collapsible open={createOpen} onOpenChange={setCreateOpen}>
          <CollapsibleTrigger asChild>
            <Button size="sm" className="w-full justify-between" variant={createOpen ? "secondary" : "default"}>
              <span className="flex items-center gap-1">
                <Plus className="h-3.5 w-3.5" /> New Listing
              </span>
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", createOpen && "rotate-180")} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-sm space-y-sm">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Listing name (optional)…"
              className="text-body-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); handleCreate(); }
              }}
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
            <Button size="sm" className="w-full" onClick={handleCreate} disabled={isCreating}>
              {isCreating ? "Creating…" : "Create"}
            </Button>
          </CollapsibleContent>
        </Collapsible>

        {/* Search */}
        {listings.length > 2 && (
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search listings…"
              className="text-body-sm pl-8 h-8"
            />
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-xs space-y-xs">
        {filtered.map((l) => {
          const statusCfg = STATUS_CONFIG[l.status] ?? STATUS_CONFIG.draft;
          return (
            <div
              key={l.id}
              onClick={() => onSelect(l.id)}
              className={cn(
                "group flex items-start justify-between p-sm rounded-lg cursor-pointer transition-smooth",
                selectedId === l.id
                  ? "bg-primary/10 border border-primary/30"
                  : "hover:bg-card-hover border border-transparent",
              )}
            >
              <div className="flex-1 min-w-0">
                <p className="text-body-sm font-medium text-foreground truncate">{l.name}</p>
                <div className="flex items-center gap-xs mt-xs flex-wrap">
                  <Badge variant="outline" className="text-metadata px-1.5 py-0">
                    {l.store_type === "apple" ? "Apple" : "Play"}
                  </Badge>
                  <Badge variant="outline" className="text-metadata px-1.5 py-0 uppercase">
                    {l.locale}
                  </Badge>
                  <span className={cn("text-metadata px-1.5 py-0 rounded-sm font-medium", statusCfg.className)}>
                    {statusCfg.label}
                  </span>
                </div>
                <p className="text-metadata text-muted-foreground mt-xs">
                  {formatDistanceToNow(new Date(l.updated_at), { addSuffix: true })}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(l.id);
                }}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-smooth p-1 mt-0.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
        {filtered.length === 0 && listings.length > 0 && (
          <p className="text-body-sm text-muted-foreground text-center py-lg">No matches</p>
        )}
        {listings.length === 0 && (
          <p className="text-body-sm text-muted-foreground text-center py-xl">No listings yet</p>
        )}
      </div>
    </div>
  );
}
