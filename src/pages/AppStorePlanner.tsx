import { useState, useCallback, useRef } from "react";
import { Smartphone } from "lucide-react";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/layout/PageHeader";
import { AppStoreListingList } from "@/components/app-store/AppStoreListingList";
import { AppStoreEditorForm } from "@/components/app-store/AppStoreEditorForm";
import { AppStorePreview } from "@/components/app-store/AppStorePreview";
import { TranslationEditor } from "@/components/app-store/TranslationEditor";
import { AppStoreListingComments } from "@/components/app-store/AppStoreListingComments";
import { useAppStoreListings } from "@/hooks/useAppStoreListings";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import type { AppStoreListing } from "@/domain/app-store";

export default function AppStorePlanner() {
  const { listings, isLoading, createListing, updateListing, deleteListing, duplicateListing } = useAppStoreListings();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editorTab, setEditorTab] = useState<"editor" | "translations" | "comments">("editor");

  const selected = listings.find((l) => l.id === selectedId) ?? null;

  const handleCreate = useCallback(
    (name: string, pageType: "product_page" | "cpp") => {
      createListing.mutate({ name, store_type: "apple", locale: "en", page_type: pageType }, {
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
      callback: () => {},
    },
    {
      key: "n",
      ctrl: true,
      callback: () => {
        handleCreate("", "product_page");
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
                onSelect={(id) => { setSelectedId(id); setEditorTab("editor"); }}
                onCreate={handleCreate}
                onDelete={handleDelete}
                onDuplicate={handleDuplicate}
                isCreating={createListing.isPending}
              />
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel defaultSize={40} minSize={25}>
            <div className="h-full overflow-hidden flex flex-col">
              {selected ? (
                <>
                  {/* Editor / Translations tab toggle */}
                  <div className="px-sm pt-sm border-b border-border">
                     <Tabs value={editorTab} onValueChange={(v) => setEditorTab(v as "editor" | "translations" | "comments")}>
                      <TabsList className="h-8">
                        <TabsTrigger value="editor" className="text-metadata px-md h-7">Editor</TabsTrigger>
                        <TabsTrigger value="translations" className="text-metadata px-md h-7">Translations</TabsTrigger>
                        <TabsTrigger value="comments" className="text-metadata px-md h-7">Comments</TabsTrigger>
                      </TabsList>
                    </Tabs>
                   </div>
                  <div className="flex-1 min-h-0 overflow-hidden">
                    {editorTab === "editor" ? (
                      <AppStoreEditorForm
                        key={selected.id}
                        listing={selected}
                        onUpdate={handleUpdate}
                        isSaving={updateListing.isPending}
                        saveError={updateListing.isError}
                      />
                    ) : editorTab === "translations" ? (
                      <TranslationEditor key={`trans-${selected.id}`} listing={selected} />
                    ) : (
                      <AppStoreListingComments key={`comments-${selected.id}`} listingId={selected.id} />
                    )}
                  </div>
                </>
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
