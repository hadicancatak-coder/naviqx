import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, CheckCircle, Copy, Trash2, Loader2, GripVertical, ExternalLink, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { getRecurrenceLabel } from "@/lib/recurrenceExpander";

interface TaskRowProps {
  task: any;
  onClick: (taskId: string, task?: any) => void;
  onComplete?: (taskId: string, completed: boolean) => void;
  onDuplicate?: (task: any, e: React.MouseEvent) => void;
  onDelete?: (taskId: string) => void;
  isSelected?: boolean;
  onSelect?: (taskId: string, selected: boolean) => void;
  showSelectionCheckbox?: boolean;
  showDragHandle?: boolean;
  dragHandleProps?: any;
  compact?: boolean;
  processingAction?: { taskId: string; action: 'complete' | 'duplicate' | 'delete' } | null;
  userRole?: string | null;
}

const priorityDot: Record<string, string> = {
  High: "bg-destructive",
  Medium: "bg-warning",
  Low: "bg-muted-foreground",
};

export function TaskRow({
  task,
  onClick,
  onComplete,
  onDuplicate,
  onDelete,
  isSelected = false,
  onSelect,
  showSelectionCheckbox = false,
  showDragHandle = false,
  dragHandleProps,
  compact = false,
  processingAction,
  userRole,
}: TaskRowProps) {
  const [openDropdown, setOpenDropdown] = useState(false);

  const isCompleted = task.status === 'Completed';
  const isOverdue = task.due_at && new Date(task.due_at) < new Date() && !isCompleted && task.status !== 'Backlog';
  const isExternalDep = task.is_external_dependency;
  const isRecurring = task.isRecurringOccurrence || task.task_type === 'recurring' || task.recurrence_rrule;

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleCompletionChange = (checked: boolean) => {
    onComplete?.(task.id, checked);
  };

  return (
    <div
      className={cn(
        "flex items-center gap-xxs h-row-compact px-sm transition-smooth cursor-pointer group border-b border-border last:border-0",
        "hover:bg-card-hover",
        isOverdue && !isExternalDep && "border-l-2 border-l-destructive",
        isExternalDep && "border-l-2 border-l-warning bg-warning/5",
        isCompleted && "opacity-60",
        isSelected && "bg-primary/5"
      )}
      onClick={() => onClick(task.id, task)}
    >
      {/* Drag Handle */}
      {showDragHandle && (
        <div
          {...dragHandleProps}
          className="cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </div>
      )}

      {/* Selection Checkbox */}
      {showSelectionCheckbox && onSelect && (
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onSelect(task.id, checked as boolean)}
          onClick={handleCheckboxClick}
          className="border-border"
        />
      )}

      {/* Completion Checkbox */}
      {onComplete && (
        <Checkbox
          checked={isCompleted}
          onCheckedChange={handleCompletionChange}
          onClick={handleCheckboxClick}
          className={cn(
            "border-border flex-shrink-0",
            isCompleted && "bg-success border-success"
          )}
        />
      )}

      {/* Priority Dot */}
      <div
        className={cn(
          "w-2 h-2 rounded-full flex-shrink-0",
          priorityDot[task.priority as keyof typeof priorityDot] || priorityDot.Low
        )}
        title={task.priority}
      />

      {/* Title */}
      <span
        className={cn(
          "flex-1 text-body-sm font-medium text-foreground truncate min-w-0",
          isCompleted && "line-through text-muted-foreground"
        )}
      >
        {task.title}
      </span>

      {/* Badges (recurring, external) */}
      {isRecurring && !compact && (
        <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 bg-primary/10 border-primary/30 text-primary flex-shrink-0 rounded-full">
          <RotateCcw className="h-2.5 w-2.5 mr-0.5" />
          {getRecurrenceLabel(task)}
        </Badge>
      )}
      {isExternalDep && !compact && (
        <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 bg-warning/15 border-warning/30 text-warning flex-shrink-0 rounded-full">
          <ExternalLink className="h-2.5 w-2.5" />
        </Badge>
      )}

      {/* Assignee Avatar */}
      {task.assignees && task.assignees.length > 0 && (
        <div className="flex -space-x-1 flex-shrink-0">
          {task.assignees.slice(0, 2).map((assignee: any) => (
            <Avatar key={assignee.user_id || assignee.id} className="h-5 w-5 border border-background">
              <AvatarImage src={assignee.avatar_url} />
              <AvatarFallback className="text-[8px] bg-muted text-muted-foreground">
                {assignee.name?.charAt(0) || '?'}
              </AvatarFallback>
            </Avatar>
          ))}
          {task.assignees.length > 2 && (
            <div className="h-5 w-5 rounded-full bg-muted border border-background flex items-center justify-center">
              <span className="text-[8px] font-medium text-muted-foreground">+{task.assignees.length - 2}</span>
            </div>
          )}
        </div>
      )}

      {/* Due Date */}
      {task.due_at && (
        <span
          className={cn(
            "text-metadata flex-shrink-0 min-w-[48px] text-right",
            isOverdue && !isExternalDep ? "text-destructive font-medium" : "text-muted-foreground"
          )}
        >
          {format(new Date(task.due_at), 'MMM d')}
        </span>
      )}

      {/* Actions Menu */}
      {(onDuplicate || onDelete) && (
        <DropdownMenu open={openDropdown} onOpenChange={setOpenDropdown}>
          <DropdownMenuTrigger
            onClick={(e) => e.stopPropagation()}
            className="opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 p-1 rounded hover:bg-muted"
          >
            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            {onComplete && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onComplete(task.id, !isCompleted);
                  setOpenDropdown(false);
                }}
                disabled={processingAction !== null}
              >
                {processingAction?.taskId === task.id && processingAction?.action === 'complete' ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="mr-2 h-4 w-4" />
                )}
                {isCompleted ? 'Reopen' : 'Complete'}
              </DropdownMenuItem>
            )}
            {onDuplicate && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onDuplicate(task, e);
                  setOpenDropdown(false);
                }}
                disabled={processingAction !== null}
              >
                {processingAction?.taskId === task.id && processingAction?.action === 'duplicate' ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Copy className="mr-2 h-4 w-4" />
                )}
                Duplicate
              </DropdownMenuItem>
            )}
            {onDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(task.id);
                    setOpenDropdown(false);
                  }}
                  disabled={processingAction !== null}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {userRole === 'admin' ? 'Delete' : 'Request Delete'}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
