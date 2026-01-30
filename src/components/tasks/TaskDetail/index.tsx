import { useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { BlockerDialog } from "@/components/BlockerDialog";
import { TaskDetailSkeleton } from "@/components/skeletons/TaskDetailSkeleton";
import { TaskDetailProvider, useTaskDetailContext } from "./TaskDetailContext";
import { TaskDetailHeader } from "./TaskDetailHeader";
import { TaskDetailFields } from "./TaskDetailFields";
import { TaskDetailDescription } from "./TaskDetailDescription";
import { TaskDetailSubtasks } from "./TaskDetailSubtasks";
import { TaskDetailComments } from "./TaskDetailComments";
import { TaskDetailActivityLog } from "./TaskDetailActivityLog";
import { TaskDetailDetails } from "./TaskDetailDetails";
import { TaskDetailCommentInput } from "./TaskDetailCommentInput";

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
    <div className="h-full flex flex-col liquid-glass-elevated rounded-l-xl">
      <TaskDetailHeader onClose={onClose} />
      
      <ScrollArea className="flex-1">
        <div className="p-md space-y-md">
          {/* Core Info: Title, Priority Card, Assignees */}
          <TaskDetailFields />
          
          <Separator />
          
          {/* Description - Collapsible */}
          <TaskDetailDescription />
          
          <Separator />
          
          {/* Subtasks */}
          <TaskDetailSubtasks />
          
          <Separator />
          
          {/* Comments - Separated from Activity, expanded by default */}
          <TaskDetailComments />
          
          <Separator />
          
          {/* Activity Log - Collapsed by default */}
          <TaskDetailActivityLog />
          
          <Separator />
          
          {/* Details - Tags, Project, Sprint, Metadata - Collapsed by default */}
          <TaskDetailDetails />
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  task?: any;
  onClose?: () => void;
  onTaskDeleted?: () => void;
}

export function TaskDetail({ taskId, task, onClose, onTaskDeleted }: TaskDetailProps) {
  // Key prop forces remount when taskId changes, ensuring fresh state
  return (
    <TaskDetailProvider 
      key={taskId}
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
// eslint-disable-next-line react-refresh/only-export-components
export { useTaskDetailContext } from "./TaskDetailContext";
