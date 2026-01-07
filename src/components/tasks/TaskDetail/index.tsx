import { useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { BlockerDialog } from "@/components/BlockerDialog";
import { TaskDetailProvider, useTaskDetailContext } from "./TaskDetailContext";
import { TaskDetailHeader } from "./TaskDetailHeader";
import { TaskDetailFields } from "./TaskDetailFields";
import { TaskDetailDescription } from "./TaskDetailDescription";
import { TaskDetailSubtasks } from "./TaskDetailSubtasks";
import { TaskDetailActivity } from "./TaskDetailActivity";
import { TaskDetailCommentInput } from "./TaskDetailCommentInput";

// Loading skeleton
const TaskDetailSkeleton = () => (
  <div className="p-md space-y-md">
    <Skeleton className="h-8 w-3/4" />
    <div className="flex gap-sm">
      <Skeleton className="h-6 w-20" />
      <Skeleton className="h-6 w-20" />
      <Skeleton className="h-6 w-24" />
    </div>
    <Skeleton className="h-24 w-full" />
    <Skeleton className="h-32 w-full" />
  </div>
);

// Internal component that uses context
function TaskDetailContent({ onClose }: { onClose?: () => void }) {
  const { 
    loading, 
    taskId, 
    blockerDialogOpen, 
    setBlockerDialogOpen, 
    fetchBlocker 
  } = useTaskDetailContext();

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (loading) {
    return (
      <div className="h-full flex flex-col liquid-glass-elevated rounded-l-xl">
        <TaskDetailSkeleton />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col liquid-glass-elevated rounded-l-xl animate-slide-in-right relative">
      <TaskDetailHeader onClose={onClose} />
      
      <ScrollArea className="flex-1">
        <div className="p-md space-y-md">
          <TaskDetailFields />
          <Separator />
          <TaskDetailDescription />
          <Separator />
          <TaskDetailSubtasks />
          <Separator />
          <TaskDetailActivity />
        </div>
      </ScrollArea>
      
      <TaskDetailCommentInput />
      
      <BlockerDialog 
        open={blockerDialogOpen} 
        onOpenChange={setBlockerDialogOpen} 
        taskId={taskId} 
        onSuccess={fetchBlocker} 
      />
    </div>
  );
}

// Main exported component
export interface TaskDetailProps {
  taskId: string;
  task?: any;
  onClose?: () => void;
  onTaskDeleted?: () => void;
}

export function TaskDetail({ taskId, task, onClose, onTaskDeleted }: TaskDetailProps) {
  return (
    <TaskDetailProvider 
      taskId={taskId} 
      cachedTask={task} 
      onClose={onClose}
      onTaskDeleted={onTaskDeleted}
    >
      <TaskDetailContent onClose={onClose} />
    </TaskDetailProvider>
  );
}

// Re-export context hook for external use
export { useTaskDetailContext } from "./TaskDetailContext";
