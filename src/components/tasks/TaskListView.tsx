import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, CheckCircle, Copy, Trash2 } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
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
  Low: "bg-success",
};

const statusColors: Record<string, string> = {
  Pending: "bg-muted text-muted-foreground",
  Backlog: "bg-muted text-muted-foreground",
  Ongoing: "bg-primary/15 text-primary border-primary/30",
  "In Progress": "bg-primary/15 text-primary border-primary/30",
  Blocked: "bg-destructive/15 text-destructive border-destructive/30",
  Completed: "bg-success/15 text-success border-success/30",
  Failed: "bg-destructive/15 text-destructive border-destructive/30",
};

// Strip HTML tags for description preview
function stripHtml(html: string): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
}

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

  // Get first assignee full name
  const getAssigneeName = (task: any) => {
    if (!task.assignees || task.assignees.length === 0) return null;
    const first = task.assignees[0];
    const name = first.name || first.username || 'Unknown';
    if (task.assignees.length > 1) {
      return `${name} +${task.assignees.length - 1}`;
    }
    return name;
  };

  // Calculate subtask progress
  const getSubtaskProgress = (task: any) => {
    const total = task.subtask_count || 0;
    const completed = task.completed_subtask_count || 0;
    if (total === 0) return null;
    return { completed, total, percent: Math.round((completed / total) * 100) };
  };

  // Format relative time
  const getRelativeTime = (date: string) => {
    if (!date) return '—';
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: false });
    } catch {
      return '—';
    }
  };

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card">
      {/* Header */}
      <div className="flex items-center h-9 px-3 bg-muted/50 border-b border-border text-metadata font-medium text-muted-foreground uppercase tracking-wide">
        <div className="w-7 flex-shrink-0">
          <Checkbox
            checked={allSelected}
            onCheckedChange={handleSelectAll}
            className="h-3.5 w-3.5"
          />
        </div>
        <div className="w-3 flex-shrink-0" /> {/* Priority dot */}
        <div className="w-[32%] min-w-0 pl-2">Task</div>
        <div className="w-20 flex-shrink-0 hidden 2xl:block">Progress</div>
        <div className="w-[10%] flex-shrink-0 hidden xl:block">Entity</div>
        <div className="w-[8%] flex-shrink-0 hidden lg:block">Status</div>
        <div className="w-[12%] flex-shrink-0 hidden lg:block">Tags</div>
        <div className="w-[14%] flex-shrink-0 hidden md:block">Assignee</div>
        <div className="w-20 flex-shrink-0 hidden xl:block">Updated</div>
        <div className="w-16 flex-shrink-0 text-right">Due</div>
        <div className="w-8 flex-shrink-0" /> {/* Actions */}
      </div>

      {/* Rows */}
      <div>
        {tasks.map((task, index) => {
          const completed = task.status === 'Completed';
          const overdue = isOverdue(task);
          const focused = index === focusedIndex;
          const selected = selectedIds.includes(task.id);
          
          // Get first 2 tags
          const tags = task.labels?.slice(0, 2) || [];
          const extraTagCount = (task.labels?.length || 0) - 2;
          
          // Description preview - expanded to 100 chars
          const descPreview = stripHtml(task.description || '').slice(0, 100);

          // Status styling
          const statusStyle = statusColors[task.status] || statusColors.Pending;

          // Subtask progress
          const progress = getSubtaskProgress(task);

          return (
            <div
              key={task.id}
              onClick={() => onTaskClick(task.id, task)}
              className={cn(
                "group flex items-center h-12 px-3 cursor-pointer transition-colors",
                "border-b border-border/50 last:border-b-0",
                "hover:bg-muted/30",
                completed && "opacity-50",
                selected && "bg-primary/10",
                focused && "ring-1 ring-inset ring-primary/50 bg-primary/5",
                overdue && !completed && "bg-destructive/5"
              )}
            >
              {/* Selection Checkbox */}
              <div className="w-7 flex-shrink-0">
                <Checkbox
                  checked={selected}
                  onCheckedChange={(checked) => handleSelect(task.id, checked as boolean, { stopPropagation: () => {} } as any)}
                  onClick={(e) => handleSelect(task.id, !selected, e)}
                  className="h-3.5 w-3.5"
                />
              </div>

              {/* Priority Dot */}
              <div className="w-3 flex-shrink-0 flex justify-center">
                <div
                  className={cn(
                    "w-2.5 h-2.5 rounded-full",
                    priorityColors[task.priority] || "bg-muted-foreground/40"
                  )}
                  title={task.priority}
                />
              </div>

              {/* Task Title + Description */}
              <div className="w-[32%] min-w-0 pl-2">
                <div className={cn(
                  "truncate text-body-sm leading-tight",
                  completed && "line-through text-muted-foreground"
                )}>
                  {task.title}
                </div>
                {descPreview && (
                  <div className="truncate text-metadata text-muted-foreground/70 leading-tight">
                    {descPreview}
                  </div>
                )}
              </div>

              {/* Progress - subtask completion */}
              <div className="w-20 flex-shrink-0 hidden 2xl:flex items-center gap-1.5 px-1">
                {progress ? (
                  <>
                    <div className="h-1.5 w-10 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full transition-all" 
                        style={{ width: `${progress.percent}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground tabular-nums">
                      {progress.completed}/{progress.total}
                    </span>
                  </>
                ) : (
                  <span className="text-muted-foreground/50 text-metadata">—</span>
                )}
              </div>

              {/* Entity */}
              <div className="w-[10%] flex-shrink-0 hidden xl:block px-1">
                <span className="text-metadata text-muted-foreground truncate block">
                  {task.entity || '—'}
                </span>
              </div>

              {/* Status Badge */}
              <div className="w-[8%] flex-shrink-0 hidden lg:block px-1">
                <Badge 
                  variant="outline" 
                  className={cn("text-[10px] px-1.5 h-5 font-medium", statusStyle)}
                >
                  {task.status || 'Pending'}
                </Badge>
              </div>

              {/* Tags - show 2 max */}
              <div className="w-[12%] flex-shrink-0 hidden lg:flex items-center gap-1 px-1">
                {tags.length > 0 ? (
                  <>
                    {tags.map((tag: string) => {
                      const tagDef = TASK_TAGS.find(t => t.value === tag);
                      return (
                        <Badge 
                          key={tag}
                          variant="outline" 
                          className={cn("text-[10px] px-1.5 h-5 truncate max-w-[56px]", tagDef?.color)}
                        >
                          {tagDef?.label || tag}
                        </Badge>
                      );
                    })}
                    {extraTagCount > 0 && (
                      <span className="text-[10px] text-muted-foreground">+{extraTagCount}</span>
                    )}
                  </>
                ) : (
                  <span className="text-muted-foreground text-metadata">—</span>
                )}
              </div>

              {/* Assignee - Full name */}
              <div className="w-[14%] flex-shrink-0 hidden md:block px-1">
                <span className="text-body-sm text-muted-foreground truncate block">
                  {getAssigneeName(task) || '—'}
                </span>
              </div>

              {/* Last Updated */}
              <div className="w-20 flex-shrink-0 hidden xl:block px-1">
                <span className="text-metadata text-muted-foreground truncate block">
                  {getRelativeTime(task.updated_at)}
                </span>
              </div>

              {/* Due Date */}
              <div className={cn(
                "w-16 flex-shrink-0 text-right text-metadata tabular-nums",
                overdue && !completed ? "text-destructive font-medium" : "text-muted-foreground"
              )}>
                {task.due_at ? format(new Date(task.due_at), 'MMM d') : '—'}
              </div>

              {/* Actions */}
              <div className="w-8 flex-shrink-0 flex justify-end">
                <DropdownMenu>
                  <DropdownMenuTrigger 
                    onClick={(e) => e.stopPropagation()}
                    className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 rounded hover:bg-muted"
                  >
                    <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-36">
                    <DropdownMenuItem onClick={(e) => handleComplete(task, e as any)}>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      {completed ? 'Reopen' : 'Complete'}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => handleDuplicate(task, e as any)}>
                      <Copy className="mr-2 h-4 w-4" />
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={(e) => handleDelete(task, e as any)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {userRole === 'admin' ? 'Delete' : 'Request Delete'}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}