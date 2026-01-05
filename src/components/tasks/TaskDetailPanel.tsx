import { TaskDetail, TaskDetailProps } from "./TaskDetail";
import { Skeleton } from "@/components/ui/skeleton";

// Re-export Skeleton for any external usage
export const PanelSkeleton = () => (
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

// Re-export the old interface for backwards compatibility
export interface TaskDetailPanelProps {
  taskId: string;
  task?: any;
  onClose: () => void;
  onTaskDeleted?: () => void;
}

// TaskDetailPanel is now a thin wrapper around the modular TaskDetail component
export function TaskDetailPanel({ taskId, task, onClose, onTaskDeleted }: TaskDetailPanelProps) {
  return (
    <TaskDetail 
      taskId={taskId}
      task={task}
      onClose={onClose}
      onTaskDeleted={onTaskDeleted}
    />
  );
}
