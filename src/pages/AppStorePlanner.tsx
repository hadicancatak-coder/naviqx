import { useState, useCallback, useRef } from "react";
import { Smartphone } from "lucide-react";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { PageHeader } from "@/components/layout/PageHeader";
import { AppStoreListingList } from "@/components/app-store/AppStoreListingList";
import { AppStoreEditorForm } from "@/components/app-store/AppStoreEditorForm";
import { AppStorePreview } from "@/components/app-store/AppStorePreview";
import { useAppStoreListings } from "@/hooks/useAppStoreListings";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import type { AppStoreListing, StoreType } from "@/domain/app-store";

export default function AppStorePlanner() {
  const { listings, isLoading, createListing, updateListing, deleteListing, duplicateListing } = useAppStoreListings();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const createTriggerRef = useRef<(() => void) | null>(null);

  const selected = listings.find((l) => l.id === selectedId) ?? null;

  const handleCreate = useCallback(
    (name: string, storeType: StoreType) => {
      createListing.mutate({ name, store_type: storeType, locale: "en" }, {
        onSuccess: (data) => setSelectedId(data.id),
      });
    },
    [createListing],
  );

  const handleUpdate = useCallback(
    (updates: Partial<AppStoreListing>) => {
      if (!selectedId) return;
      updateListing.mutate({ id: selectedId, ...updates });
    },
    [selectedId, updateListing],
  );

  const handleDelete = useCallback(
    (id: string) => {
      deleteListing.mutate(id);
      if (selectedId === id) setSelectedId(null);
    },
    [deleteListing, selectedId],
  );

  const handleDuplicate = useCallback(
    (listing: AppStoreListing) => {
      duplicateListing.mutate(listing, {
        onSuccess: (data) => setSelectedId(data.id),
      });
    },
    [duplicateListing],
  );

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: "s",
      ctrl: true,
      callback: () => {
        // Force flush is handled by the editor's debounce - this prevents default browser save
      },
    },
    {
      key: "n",
      ctrl: true,
      callback: () => {
        handleCreate("", "apple");
      },
    },
    {
      key: "d",
      ctrl: true,
      shift: true,
      callback: () => {
        if (selected) handleDuplicate(selected);
      },
    },
  ]);

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      <div className="px-lg pt-lg">
        <PageHeader
          title="App Store Planner"
          description="Write and preview App Store & Google Play listings"
          icon={Smartphone}
        />
      </div>

      <div className="flex-1 min-h-0">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          <ResizablePanel defaultSize={18} minSize={12} maxSize={25}>
            <div className="h-full liquid-glass-elevated border-r border-border overflow-hidden">
              <AppStoreListingList
                listings={listings}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onCreate={handleCreate}
                onDelete={handleDelete}
                onDuplicate={handleDuplicate}
                isCreating={createListing.isPending}
              />
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel defaultSize={40} minSize={25}>
            <div className="h-full overflow-hidden">
              {selected ? (
                <AppStoreEditorForm
                  key={selected.id}
                  listing={selected}
                  onUpdate={handleUpdate}
                  isSaving={updateListing.isPending}
                  saveError={updateListing.isError}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-body-sm">
                  {isLoading ? "Loading…" : "Select or create a listing to start editing"}
                </div>
              )}
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel defaultSize={42} minSize={30}>
            <div className="h-full liquid-glass-elevated border-l border-border overflow-hidden">
              {selected ? (
                <AppStorePreview listing={selected} />
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-body-sm">
                  Preview will appear here
                </div>
              )}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
