import { useState } from "react";
import { PageContainer, PageHeader } from "@/components/layout";
import { WhiteboardContainer, WhiteboardSidebar } from "@/components/whiteboard";
import { useWhiteboard } from "@/hooks/useWhiteboard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { PanelRightClose, PanelRightOpen } from "lucide-react";

export default function Whiteboard() {
  const {
    whiteboard,
    items,
    connectors,
    isLoading,
    createItem,
    updateItem,
    saveItem,
    deleteItem,
    createConnector,
    deleteConnector,
  } = useWhiteboard();

  const [showSidebar, setShowSidebar] = useState(true);

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
      <PageContainer>
        <PageHeader title="Whiteboard" description="Visual planning and ideation space" />
        <div className="flex items-center justify-center h-[600px]">
          <Skeleton className="w-[1200px] h-[675px] rounded-xl" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer size="full">
      <div className="flex items-center justify-between mb-md">
        <PageHeader title={whiteboard?.name || "Whiteboard"} description="Visual planning and ideation space" />
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
            onDeleteConnector={deleteConnector}
          />
        </div>
        {showSidebar && <WhiteboardSidebar onAddTask={handleAddTaskFromSidebar} />}
      </div>
    </PageContainer>
  );
}
