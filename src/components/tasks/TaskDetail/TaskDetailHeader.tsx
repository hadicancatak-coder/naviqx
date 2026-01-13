import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, MoreHorizontal, Trash2, X, CornerDownRight, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { RecurringCompletionToggle } from "@/components/tasks/RecurringCompletionToggle";

interface TaskDetailHeaderProps {
  onClose?: () => void;
  showCloseButton?: boolean;
}

export function TaskDetailHeader({ onClose, showCloseButton = true }: TaskDetailHeaderProps) {
  const { 
    taskId,
    task,
    title, 
    saving, 
    isCompleted, 
    isSubtask,
    parentTask,
    markComplete, 
    deleteTask 
  } = useTaskDetailContext();
  const { openTaskDrawer } = useTaskDrawer();
  
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const isRecurring = task?.task_type === 'recurring';

  const handleDelete = async () => {
    await deleteTask();
    setShowDeleteDialog(false);
  };

  const handleCopyLink = () => {
    const url = `https://prismax1.lovable.app/tasks?task=${taskId}`;
    navigator.clipboard.writeText(url);
    toast.success("Task link copied to clipboard");
  };

  return (
    <>
      <div className="flex-shrink-0 px-md py-sm border-b border-border">
        {/* Parent task breadcrumb for subtasks */}
        {isSubtask && parentTask && (
          <div className="flex items-center gap-xs text-metadata text-muted-foreground mb-xs">
            <CornerDownRight className="h-3 w-3" />
            <span>Subtask of</span>
            <button 
              onClick={() => openTaskDrawer(parentTask.id, { id: parentTask.id, title: parentTask.title })}
              className="text-primary hover:underline font-medium"
            >
              {parentTask.title}
            </button>
          </div>
        )}
        
        <div className="flex items-center justify-between gap-sm">
          <div className="flex items-center gap-sm flex-wrap">
            {isSubtask && (
              <Badge variant="secondary" className="text-metadata">Subtask</Badge>
            )}
            {isRecurring && (
              <Badge variant="secondary" className="text-metadata bg-info/10 text-info border-info/30">Recurring</Badge>
            )}
            
            {/* Show recurring toggle for recurring tasks, regular complete for others */}
            {isRecurring ? (
              <RecurringCompletionToggle taskId={taskId} />
            ) : (
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
            )}
            
            {saving && (
              <Badge variant="secondary" className="text-metadata">Saving...</Badge>
            )}
          </div>
          
          <div className="flex items-center gap-xs">
            <TaskWatchButton taskId={taskId} showWatchers={false} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleCopyLink}>
                <Link2 className="h-4 w-4 mr-2" />
                Copy Link
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-destructive focus:text-destructive"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Task
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
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
              Are you sure you want to delete "{title}"? This action cannot be undone.
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
