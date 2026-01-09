import { useState, useMemo } from "react";
import { PageContainer } from "@/components/layout";
import { WhiteboardContainer, WhiteboardSidebar, WhiteboardHeader } from "@/components/whiteboard";
import { useWhiteboard } from "@/hooks/useWhiteboard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { PanelRightClose, PanelRightOpen } from "lucide-react";

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
    switchWhiteboard,
  } = useWhiteboard();

  const [showSidebar, setShowSidebar] = useState(true);

  // Get task IDs that are already on the whiteboard
  const tasksOnBoard = useMemo(() => {
    return items
      .filter(item => item.type === "task" && item.metadata)
      .map(item => (item.metadata as { task_id?: string })?.task_id)
      .filter((id): id is string => !!id);
  }, [items]);

  const handleAddTaskFromSidebar = (taskId: string, taskTitle: string, status: string, priority: string) => {
    const x = 100 + Math.random() * 400;
    const y = 100 + Math.random() * 300;
    createItem({
      type: "task",
      x: Math.round(x),
      y: Math.round(y),
      content: taskTitle,
      metadata: { task_id: taskId, status, priority },
    });
  };

  if (isLoading) {
    return (
      <PageContainer size="full">
        <div className="mb-md">
          <Skeleton className="h-10 w-64" />
        </div>
        <div className="flex items-center justify-center h-[600px]">
          <Skeleton className="w-[1200px] h-[675px] rounded-xl" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer size="full">
      <WhiteboardHeader
        whiteboard={whiteboard}
        allWhiteboards={allWhiteboards}
        onUpdateWhiteboard={updateWhiteboard}
        onCreateWhiteboard={createWhiteboard}
        onSwitchWhiteboard={switchWhiteboard}
      />

      <div className="flex items-center justify-end mb-sm">
        <Button variant="outline" size="sm" onClick={() => setShowSidebar(!showSidebar)} className="gap-xs">
          {showSidebar ? <><PanelRightClose className="h-4 w-4" />Hide Tasks</> : <><PanelRightOpen className="h-4 w-4" />Show Tasks</>}
        </Button>
      </div>

      <div className="flex bg-muted/30 rounded-xl overflow-hidden border border-border">
        <div className="flex-1 overflow-auto">
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
        {showSidebar && (
          <WhiteboardSidebar 
            onAddTask={handleAddTaskFromSidebar} 
            tasksOnBoard={tasksOnBoard}
          />
        )}
      </div>
    </PageContainer>
  );
}
