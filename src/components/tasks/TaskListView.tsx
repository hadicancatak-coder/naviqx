import { useState, useCallback } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, CheckCircle, Copy, Trash2, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { TASK_TAGS } from "@/lib/constants";

interface TaskListViewProps {
  tasks: any[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onTaskClick: (taskId: string, task?: any) => void;
  onShiftSelect: (taskId: string, shiftKey: boolean) => void;
  focusedIndex: number;
  onRefresh: () => void;
}

const priorityColors: Record<string, string> = {
  High: "bg-destructive",
  Medium: "bg-warning",
  Low: "bg-muted-foreground/40",
};

export function TaskListView({
  tasks,
  selectedIds,
  onSelectionChange,
  onTaskClick,
  onShiftSelect,
  focusedIndex,
  onRefresh,
}: TaskListViewProps) {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const allSelected = tasks.length > 0 && selectedIds.length === tasks.length;

  const handleSelectAll = (checked: boolean) => {
    onSelectionChange(checked ? tasks.map(t => t.id) : []);
  };

  const handleSelect = (taskId: string, checked: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    if (e.shiftKey) {
      onShiftSelect(taskId, true);
    } else {
      onSelectionChange(
        checked ? [...selectedIds, taskId] : selectedIds.filter(id => id !== taskId)
      );
    }
  };

  const handleComplete = async (task: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setProcessingId(task.id);
    try {
      const newStatus = task.status === 'Completed' ? 'Pending' : 'Completed';
      await supabase.from('tasks').update({ status: newStatus }).eq('id', task.id);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast({ title: newStatus === 'Completed' ? "Task completed" : "Task reopened" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setProcessingId(null);
    }
  };

  const handleDuplicate = async (task: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setProcessingId(task.id);
    try {
      const { error } = await supabase.from('tasks').insert({
        title: `${task.title} (Copy)`,
        description: task.description,
        priority: task.priority,
        status: 'Pending',
        due_at: task.due_at,
        labels: task.labels,
        entity: task.entity,
        created_by: user?.id,
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast({ title: "Task duplicated" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (task: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setProcessingId(task.id);
    try {
      if (userRole === 'admin') {
        await supabase.from('tasks').delete().eq('id', task.id);
        toast({ title: "Task deleted" });
      } else {
        await supabase.from('tasks').update({
          delete_requested_by: user?.id,
          delete_requested_at: new Date().toISOString(),
        }).eq('id', task.id);
        toast({ title: "Delete request sent" });
      }
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setProcessingId(null);
    }
  };

  const isOverdue = (task: any) => {
    if (!task.due_at || task.status === 'Completed') return false;
    return new Date(task.due_at) < new Date();
  };

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card">
      {/* Header */}
      <div className="flex items-center gap-3 h-9 px-3 bg-muted/50 border-b border-border text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
        <Checkbox
          checked={allSelected}
          onCheckedChange={handleSelectAll}
          className="h-3.5 w-3.5"
        />
        <div className="w-5" /> {/* Priority column */}
        <div className="flex-1">Task</div>
        <div className="w-20 text-center hidden sm:block">Assignee</div>
        <div className="w-16 text-right">Due</div>
        <div className="w-6" /> {/* Actions */}
      </div>

      {/* Rows */}
      <div>
        {tasks.map((task, index) => {
          const completed = task.status === 'Completed';
          const overdue = isOverdue(task);
          const focused = index === focusedIndex;
          const selected = selectedIds.includes(task.id);
          const firstTag = task.labels?.[0];
          const tagDef = firstTag ? TASK_TAGS.find(t => t.value === firstTag) : null;

          return (
            <div
              key={task.id}
              onClick={() => onTaskClick(task.id, task)}
              className={cn(
                "flex items-center gap-3 h-10 px-3 cursor-pointer transition-colors",
                "border-b border-border/50 last:border-b-0",
                "hover:bg-muted/30",
                completed && "opacity-50",
                selected && "bg-primary/10",
                focused && "ring-1 ring-inset ring-primary/50 bg-primary/5",
                overdue && "bg-destructive/5"
              )}
            >
              {/* Selection */}
              <Checkbox
                checked={selected}
                onCheckedChange={(checked) => handleSelect(task.id, checked as boolean, { stopPropagation: () => {} } as any)}
                onClick={(e) => handleSelect(task.id, !selected, e)}
                className="h-3.5 w-3.5"
              />

              {/* Priority Dot */}
              <div className="w-5 flex justify-center">
                <div
                  className={cn(
                    "w-2 h-2 rounded-full",
                    priorityColors[task.priority] || priorityColors.Low
                  )}
                  title={task.priority}
                />
              </div>

              {/* Completion Checkbox + Title */}
              <div className="flex-1 flex items-center gap-2 min-w-0">
                <Checkbox
                  checked={completed}
                  onCheckedChange={() => handleComplete(task, { stopPropagation: () => {} } as any)}
                  onClick={(e) => handleComplete(task, e)}
                  className={cn(
                    "h-4 w-4 flex-shrink-0",
                    completed && "bg-success border-success"
                  )}
                />
                <span className={cn(
                  "truncate text-body-sm",
                  completed && "line-through text-muted-foreground"
                )}>
                  {task.title}
                </span>
                {tagDef && (
                  <Badge 
                    variant="outline" 
                    className={cn("text-[10px] px-1.5 h-4 hidden md:inline-flex", tagDef.color)}
                  >
                    {tagDef.label}
                  </Badge>
                )}
              </div>

              {/* Assignees */}
              <div className="w-20 hidden sm:flex justify-center">
                {task.assignees && task.assignees.length > 0 ? (
                  <div className="flex -space-x-1">
                    {task.assignees.slice(0, 2).map((a: any) => (
                      <Avatar key={a.user_id || a.id} className="h-5 w-5 border border-background">
                        <AvatarImage src={a.avatar_url} />
                        <AvatarFallback className="text-[8px] bg-muted">
                          {a.name?.charAt(0) || '?'}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                    {task.assignees.length > 2 && (
                      <div className="h-5 w-5 rounded-full bg-muted border border-background flex items-center justify-center text-[8px]">
                        +{task.assignees.length - 2}
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="text-[10px] text-muted-foreground">—</span>
                )}
              </div>

              {/* Due Date */}
              <div className={cn(
                "w-16 text-right text-[11px] tabular-nums",
                overdue ? "text-destructive font-medium" : "text-muted-foreground"
              )}>
                {task.due_at ? format(new Date(task.due_at), 'MMM d') : '—'}
              </div>

              {/* Actions */}
              <DropdownMenu>
                <DropdownMenuTrigger 
                  onClick={(e) => e.stopPropagation()}
                  className="opacity-0 group-hover:opacity-100 hover:opacity-100 focus:opacity-100 p-1 rounded hover:bg-muted"
                >
                  <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-36">
                  <DropdownMenuItem onClick={(e) => handleComplete(task, e)}>
                    {processingId === task.id ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle className="mr-2 h-4 w-4" />
                    )}
                    {completed ? 'Reopen' : 'Complete'}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => handleDuplicate(task, e)}>
                    <Copy className="mr-2 h-4 w-4" />
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={(e) => handleDelete(task, e)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {userRole === 'admin' ? 'Delete' : 'Request Delete'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        })}
      </div>
    </div>
  );
}
