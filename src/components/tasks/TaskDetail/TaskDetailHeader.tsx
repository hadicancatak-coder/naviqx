import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Trash2, X, CornerDownRight, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_BASE_URL } from "@/lib/constants";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useTaskDetailContext } from "./TaskDetailContext";
import { useTaskDrawer } from "@/contexts/TaskDrawerContext";
import { TaskWatchButton } from "@/components/tasks/TaskWatchButton";

interface TaskDetailHeaderProps {
  onClose?: () => void;
  showCloseButton?: boolean;
}

export function TaskDetailHeader({ onClose, showCloseButton = true }: TaskDetailHeaderProps) {
  const { 
    taskId,
    task,
    mutations,
    isCompleted, 
    isSubtask,
    parentTask,
    markComplete, 
    deleteTask 
  } = useTaskDetailContext();
  const { openTaskDrawer } = useTaskDrawer();
  
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const isSaving = mutations.updateTitle.isPending || mutations.updateDescription.isPending;

  const handleDelete = async () => {
    await deleteTask();
    setShowDeleteDialog(false);
  };

  const handleCopyLink = () => {
    const url = `${APP_BASE_URL}/tasks?task=${taskId}`;
    navigator.clipboard.writeText(url);
    toast.success("Task link copied to clipboard");
  };

  return (
    <>
      <div className="flex-shrink-0 px-md py-sm border-b border-border/30 dark:border-white/10 space-y-sm">
        {/* Parent task navigation for subtasks */}
        {isSubtask && parentTask && (
          <div className="flex items-center gap-sm p-sm rounded-lg bg-muted/50 border border-border">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => openTaskDrawer(parentTask.id, { id: parentTask.id, title: parentTask.title })}
              className="gap-xs h-7 px-2"
            >
              <CornerDownRight className="h-3.5 w-3.5 rotate-180" />
              Back to parent
            </Button>
            <span className="text-muted-foreground">|</span>
            <span className="text-body-sm font-medium truncate flex-1">{parentTask.title}</span>
          </div>
        )}
        
        {/* Main header row - clean layout */}
        <div className="flex items-center justify-between gap-md">
          {/* Left: Action buttons */}
          <div className="flex items-center gap-sm">
            <Button
              variant={isCompleted ? "default" : "outline"}
              size="sm"
              onClick={markComplete}
              disabled={isCompleted}
              className={cn(
                "gap-xs",
                isCompleted && "bg-success hover:bg-success/90"
              )}
            >
              <Check className="h-4 w-4" />
              {isCompleted ? "Completed" : "Complete"}
            </Button>
            
            <TaskWatchButton taskId={taskId} showWatchers={false} />
            
            {isSaving && (
              <Badge variant="secondary" className="text-metadata">Saving...</Badge>
            )}
          </div>
          
          {/* Right: Menu and close */}
          <div className="flex items-center gap-xs">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleCopyLink}
              title="Copy task link"
              aria-label="Copy task link"
            >
              <Link2 className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setShowDeleteDialog(true)}
              title="Delete task"
              aria-label="Delete task"
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            
            {showCloseButton && onClose && (
              <Button variant="ghost" size="icon-sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{task?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
