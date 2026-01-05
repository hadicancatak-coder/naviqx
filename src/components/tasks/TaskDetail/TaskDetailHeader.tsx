import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, MoreHorizontal, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

interface TaskDetailHeaderProps {
  onClose?: () => void;
  showCloseButton?: boolean;
}

export function TaskDetailHeader({ onClose, showCloseButton = true }: TaskDetailHeaderProps) {
  const { 
    title, 
    saving, 
    isCompleted, 
    markComplete, 
    deleteTask 
  } = useTaskDetailContext();
  
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleDelete = async () => {
    await deleteTask();
    setShowDeleteDialog(false);
  };

  return (
    <>
      <div className="flex-shrink-0 px-md py-sm border-b border-border flex items-center justify-between gap-sm">
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
          {saving && (
            <Badge variant="secondary" className="text-metadata">Saving...</Badge>
          )}
        </div>
        
        <div className="flex items-center gap-xs">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
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
