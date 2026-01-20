import { useState, useRef, useEffect, useCallback } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, CheckCircle, Copy, Trash2, Loader2, GripVertical, ExternalLink, RotateCcw, ListChecks, Link2 as LinkIcon } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { getRecurrenceLabelNew } from "@/lib/recurrenceUtils";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { TASK_TAGS } from "@/lib/constants";
import { StaleBadge } from "@/components/tasks/StaleBadge";
import { DependencyBadge } from "@/components/tasks/DependencyBadge";
import { TASK_QUERY_KEY } from "@/lib/queryKeys";

interface TaskRowProps {
  task: any;
  onClick: (taskId: string, task?: any) => void;
  onComplete?: (taskId: string, completed: boolean) => void;
  onDuplicate?: (task: any, e: React.MouseEvent) => void;
  onDelete?: (taskId: string) => void;
  isSelected?: boolean;
  onSelect?: (taskId: string, selected: boolean) => void;
  onShiftSelect?: (taskId: string, shiftKey: boolean) => void;
  showSelectionCheckbox?: boolean;
  showDragHandle?: boolean;
  dragHandleProps?: any;
  compact?: boolean;
  processingAction?: { taskId: string; action: 'complete' | 'duplicate' | 'delete' } | null;
  userRole?: string | null;
  subtaskCount?: number;
  subtaskCompletedCount?: number;
  isFocused?: boolean;
  enableInlineEdit?: boolean;
}

const priorityDot: Record<string, string> = {
  High: "bg-destructive",
  Medium: "bg-warning",
  Low: "bg-muted-foreground/50",
};

export function TaskRow({
  task,
  onClick,
  onComplete,
  onDuplicate,
  onDelete,
  isSelected = false,
  onSelect,
  onShiftSelect,
  showSelectionCheckbox = false,
  showDragHandle = false,
  dragHandleProps,
  compact = false,
  processingAction,
  userRole,
  subtaskCount = 0,
  subtaskCompletedCount = 0,
  isFocused = false,
  enableInlineEdit = true,
}: TaskRowProps) {
  const queryClient = useQueryClient();
  const [openDropdown, setOpenDropdown] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(task.title);
  const inputRef = useRef<HTMLInputElement>(null);

  const isCompleted = task.status === 'Completed';
  const isOverdue = task.due_at && new Date(task.due_at) < new Date() && !isCompleted && task.status !== 'Backlog' && task.status !== 'Pending';
  const isExternalDep = task.is_external_dependency;
  const isRecurringInstance = !!task.template_task_id; // Instance created from a template
  const isRecurringTemplate = task.is_recurrence_template === true; // The template itself (shouldn't appear normally)
  const isLegacyRecurring = !isRecurringInstance && !isRecurringTemplate && (task.task_type === 'recurring' || task.recurrence_rrule);
  const isRecurring = isRecurringInstance || isRecurringTemplate || isLegacyRecurring;

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleCompletionChange = (checked: boolean) => {
    onComplete?.(task.id, checked);
  };

  // Inline editing handlers
  const startEditing = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (enableInlineEdit && !isCompleted) {
      setIsEditing(true);
      setEditValue(task.title);
    }
  }, [enableInlineEdit, isCompleted, task.title]);

  const cancelEditing = useCallback(() => {
    setIsEditing(false);
    setEditValue(task.title);
  }, [task.title]);

  const saveTitle = useCallback(async () => {
    const trimmed = editValue.trim();
    if (!trimmed || trimmed === task.title) {
      cancelEditing();
      return;
    }
    
    // Optimistic update
    queryClient.setQueryData(TASK_QUERY_KEY, (old: any[]) => 
      old?.map(t => t.id === task.id ? { ...t, title: trimmed } : t)
    );
    
    setIsEditing(false);
    
    const { error } = await supabase
      .from('tasks')
      .update({ title: trimmed })
      .eq('id', task.id);
      
    if (error) {
      // Revert on error
      queryClient.invalidateQueries({ queryKey: TASK_QUERY_KEY });
    }
  }, [editValue, task.id, task.title, queryClient, cancelEditing]);

  const handleEditKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveTitle();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEditing();
    }
  }, [saveTitle, cancelEditing]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleRowClick = (e: React.MouseEvent) => {
    if (isEditing) return;
    // Shift+Click for range selection
    if (e.shiftKey && onShiftSelect) {
      e.preventDefault();
      onShiftSelect(task.id, true);
      return;
    }
    onClick(task.id, task);
  };

  // Get first tag for display
  const firstTag = task.labels?.[0];
  const tagDef = firstTag ? TASK_TAGS.find(t => t.value === firstTag) : null;

  return (
    <div
      className={cn(
        "flex items-center gap-2 h-8 px-2 transition-smooth cursor-pointer group",
        "hover:bg-muted/50",
        isOverdue && !isExternalDep && "border-l-2 border-l-destructive/60",
        isExternalDep && "border-l-2 border-l-warning/60",
        isCompleted && "opacity-60",
        isSelected && "bg-primary/10",
        isFocused && "ring-1 ring-inset ring-primary/40 bg-primary/5"
      )}
      onClick={handleRowClick}
    >
      {/* Drag Handle */}
      {showDragHandle && (
        <div
          {...dragHandleProps}
          className="cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />
        </div>
      )}

      {/* Selection Checkbox */}
      {showSelectionCheckbox && onSelect && (
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onSelect(task.id, checked as boolean)}
          onClick={handleCheckboxClick}
          className="border-border h-3.5 w-3.5 flex-shrink-0"
        />
      )}

      {/* Completion Checkbox - Standard for all tasks */}
      {onComplete && (
        <Checkbox
          checked={isCompleted}
          onCheckedChange={handleCompletionChange}
          onClick={handleCheckboxClick}
          className={cn(
            "border-border flex-shrink-0 h-4 w-4",
            isCompleted && "bg-success border-success"
          )}
        />
      )}

      {/* Priority Dot */}
      <div
        className={cn(
          "w-1.5 h-1.5 rounded-full flex-shrink-0",
          priorityDot[task.priority as keyof typeof priorityDot] || priorityDot.Low
        )}
        title={task.priority}
      />

      {/* Title - Inline Editable */}
      {isEditing ? (
        <Input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={saveTitle}
          onKeyDown={handleEditKeyDown}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 h-6 text-body-sm font-medium py-0 px-1 border-primary"
        />
      ) : (
        <span
          onDoubleClick={startEditing}
          className={cn(
            "flex-1 text-body-sm text-foreground truncate min-w-0",
            isCompleted && "line-through text-muted-foreground"
          )}
        >
          {task.title}
        </span>
      )}

      {/* Tag Badge (first tag only) */}
      {tagDef && !compact && (
        <Badge 
          variant="outline" 
          className={cn(
            "text-metadata px-1.5 py-0 h-4 flex-shrink-0 rounded",
            tagDef.color
          )}
        >
          {tagDef.label}
        </Badge>
      )}

      {/* Badges (subtasks, recurring, external, stale, dependencies) */}
      {subtaskCount > 0 && !compact && (
        <Badge variant="outline" className="text-metadata px-1 py-0 h-4 bg-muted border-border text-muted-foreground flex-shrink-0 rounded-full">
          <ListChecks className="h-2.5 w-2.5 mr-0.5" />
          {subtaskCompletedCount}/{subtaskCount}
        </Badge>
      )}
      {isRecurringInstance && !compact && (
        <Badge variant="outline" className="text-metadata px-1 py-0 h-4 bg-primary/10 border-primary/30 text-primary flex-shrink-0 rounded-full">
          <RotateCcw className="h-2.5 w-2.5 mr-0.5" />
          Recurring
        </Badge>
      )}
      {isLegacyRecurring && !compact && (
        <Badge variant="outline" className="text-metadata px-1 py-0 h-4 bg-primary/10 border-primary/30 text-primary flex-shrink-0 rounded-full">
          <RotateCcw className="h-2.5 w-2.5 mr-0.5" />
          {task.recurrence_rrule ? getRecurrenceLabelNew(JSON.parse(task.recurrence_rrule)) : 'Recurring'}
        </Badge>
      )}
      {isExternalDep && !compact && (
        <Badge variant="outline" className="text-metadata px-1 py-0 h-4 bg-warning/15 border-warning/30 text-warning flex-shrink-0 rounded-full">
          <ExternalLink className="h-2.5 w-2.5" />
        </Badge>
      )}
      
      {/* Stale indicator */}
      {!compact && <StaleBadge task={task} />}
      
      {/* Dependencies indicator */}
      {!compact && <DependencyBadge taskId={task.id} />}

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
            "text-metadata flex-shrink-0 min-w-[40px] text-right tabular-nums",
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
            className="opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 p-0.5 rounded hover:bg-muted flex-shrink-0"
          >
            <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                const url = `https://prismax1.lovable.app/tasks?task=${task.id}`;
                navigator.clipboard.writeText(url);
                toast.success("Task link copied");
                setOpenDropdown(false);
              }}
              className="text-body-sm"
            >
              <LinkIcon className="mr-2 h-3.5 w-3.5" />
              Copy Link
            </DropdownMenuItem>
            {onComplete && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onComplete(task.id, !isCompleted);
                  setOpenDropdown(false);
                }}
                disabled={processingAction !== null}
                className="text-body-sm"
              >
                {processingAction?.taskId === task.id && processingAction?.action === 'complete' ? (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle className="mr-2 h-3.5 w-3.5" />
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
                className="text-body-sm"
              >
                {processingAction?.taskId === task.id && processingAction?.action === 'duplicate' ? (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Copy className="mr-2 h-3.5 w-3.5" />
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
                  className="text-destructive focus:text-destructive text-body-sm"
                >
                  <Trash2 className="mr-2 h-3.5 w-3.5" />
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
