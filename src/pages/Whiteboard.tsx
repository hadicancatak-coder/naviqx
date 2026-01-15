import { useState } from "react";
import { PageContainer } from "@/components/layout";
import { WhiteboardContainer, WhiteboardHeader, WhiteboardGallery } from "@/components/whiteboard";
import { useWhiteboard } from "@/hooks/useWhiteboard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function Whiteboard() {
  const {
    whiteboard,
    allWhiteboards,
    items,
    connectors,
    isLoading,
    createItem,
    updateItem,
    saveItem,
    deleteItem,
    createConnector,
    updateConnector,
    deleteConnector,
    updateWhiteboard,
    createWhiteboard,
    deleteWhiteboard,
    switchWhiteboard,
    clearSelection,
  } = useWhiteboard();

  const [showGallery, setShowGallery] = useState(true);

  const handleSelectWhiteboard = (id: string) => {
    switchWhiteboard(id);
    setShowGallery(false);
  };

  const handleRenameWhiteboard = (id: string, name: string) => {
    updateWhiteboard({ id, name });
  };

  const handleBackToGallery = () => {
    clearSelection();
    setShowGallery(true);
  };

  if (isLoading) {
    return (
      <PageContainer size="full">
        <div className="mb-md">
          <Skeleton className="h-10 w-64" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-md">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))}
        </div>
      </PageContainer>
    );
  }

  // Show gallery view by default
  if (showGallery || !whiteboard) {
    return (
      <PageContainer size="full">
        <WhiteboardGallery
          whiteboards={allWhiteboards}
          onSelectWhiteboard={handleSelectWhiteboard}
          onCreateWhiteboard={createWhiteboard}
          onDeleteWhiteboard={deleteWhiteboard}
          onRenameWhiteboard={handleRenameWhiteboard}
        />
      </PageContainer>
    );
  }

  // Show whiteboard editor - use full height layout
  return (
    <div className="flex flex-col h-[calc(100vh-64px)] px-lg py-md">
      <div className="flex items-center gap-md mb-sm flex-shrink-0">
        <Button variant="ghost" size="sm" onClick={handleBackToGallery} className="gap-xs">
          <ArrowLeft className="h-4 w-4" />
          All Whiteboards
        </Button>
      </div>

      <div className="flex-shrink-0 mb-sm">
        <WhiteboardHeader
          whiteboard={whiteboard}
          allWhiteboards={allWhiteboards}
          onUpdateWhiteboard={updateWhiteboard}
          onCreateWhiteboard={createWhiteboard}
          onSwitchWhiteboard={switchWhiteboard}
        />
      </div>

      <div className="flex-1 rounded-xl overflow-hidden border border-border">
        <WhiteboardContainer
          items={items}
          connectors={connectors}
          onCreateItem={createItem}
          onUpdateItem={updateItem}
          onSaveItem={saveItem}
          onDeleteItem={deleteItem}
          onCreateConnector={createConnector}
          onUpdateConnector={updateConnector}
          onDeleteConnector={deleteConnector}
        />
      </div>
    </div>
  );
}
