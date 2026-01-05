import { useState, useMemo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, CheckCircle, Copy, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { format, formatDistanceToNow, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { TASK_TAGS } from "@/lib/constants";

type SortField = 'title' | 'entity' | 'status' | 'assignee' | 'created_at' | 'updated_at' | 'due_at';
type SortOrder = 'asc' | 'desc';

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
  const [sortBy, setSortBy] = useState<SortField | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const allSelected = tasks.length > 0 && selectedIds.length === tasks.length;

  const toggleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const sortedTasks = useMemo(() => {
    if (!sortBy) return tasks;
    
    return [...tasks].sort((a, b) => {
      let aVal: any, bVal: any;
      
      switch (sortBy) {
        case 'title':
          aVal = a.title?.toLowerCase() || '';
          bVal = b.title?.toLowerCase() || '';
          break;
        case 'entity':
          aVal = a.entity?.toLowerCase() || '';
          bVal = b.entity?.toLowerCase() || '';
          break;
        case 'status':
          aVal = a.status?.toLowerCase() || '';
          bVal = b.status?.toLowerCase() || '';
          break;
        case 'assignee':
          aVal = a.assignees?.[0]?.name?.toLowerCase() || '';
          bVal = b.assignees?.[0]?.name?.toLowerCase() || '';
          break;
        case 'created_at':
          aVal = new Date(a.created_at || 0).getTime();
          bVal = new Date(b.created_at || 0).getTime();
          break;
        case 'updated_at':
          aVal = new Date(a.updated_at || 0).getTime();
          bVal = new Date(b.updated_at || 0).getTime();
          break;
        case 'due_at':
          aVal = a.due_at ? new Date(a.due_at).getTime() : Infinity;
          bVal = b.due_at ? new Date(b.due_at).getTime() : Infinity;
          break;
        default:
          return 0;
      }
      
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [tasks, sortBy, sortOrder]);

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

  // Format relative time
  const getRelativeTime = (date: string) => {
    if (!date) return '—';
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: false });
    } catch {
      return '—';
    }
  };

  // Calculate task age
  const getTaskAge = (createdAt: string) => {
    if (!createdAt) return '—';
    try {
      const days = differenceInDays(new Date(), new Date(createdAt));
      if (days === 0) return 'Today';
      if (days === 1) return '1d';
      if (days < 7) return `${days}d`;
      if (days < 30) return `${Math.floor(days / 7)}w`;
      if (days < 365) return `${Math.floor(days / 30)}mo`;
      return `${Math.floor(days / 365)}y`;
    } catch {
      return '—';
    }
  };

  const SortHeader = ({ field, children, className }: { field: SortField; children: React.ReactNode; className?: string }) => (
    <button
      onClick={() => toggleSort(field)}
      className={cn(
        "flex items-center gap-0.5 hover:text-foreground transition-colors",
        sortBy === field && "text-foreground",
        className
      )}
    >
      {children}
      {sortBy === field && (
        sortOrder === 'asc' 
          ? <ChevronUp className="h-3 w-3" /> 
          : <ChevronDown className="h-3 w-3" />
      )}
    </button>
  );

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
        <div className="w-[28%] min-w-0 pl-2">
          <SortHeader field="title">Task</SortHeader>
        </div>
        <div className="w-[8%] flex-shrink-0 hidden xl:block">
          <SortHeader field="entity">Entity</SortHeader>
        </div>
        <div className="w-[7%] flex-shrink-0 hidden lg:block">
          <SortHeader field="status">Status</SortHeader>
        </div>
        <div className="w-[10%] flex-shrink-0 hidden lg:block">Tags</div>
        <div className="w-[12%] flex-shrink-0 hidden md:block">
          <SortHeader field="assignee">Assignee</SortHeader>
        </div>
        <div className="w-16 flex-shrink-0 hidden 2xl:block">
          <SortHeader field="created_at">Created</SortHeader>
        </div>
        <div className="w-12 flex-shrink-0 hidden 2xl:block">Age</div>
        <div className="w-16 flex-shrink-0 hidden xl:block">
          <SortHeader field="updated_at">Updated</SortHeader>
        </div>
        <div className="w-14 flex-shrink-0 text-right">
          <SortHeader field="due_at" className="justify-end">Due</SortHeader>
        </div>
        <div className="w-8 flex-shrink-0" /> {/* Actions */}
      </div>

      {/* Rows */}
      <div>
        {sortedTasks.map((task, index) => {
          const completed = task.status === 'Completed';
          const overdue = isOverdue(task);
          const focused = index === focusedIndex;
          const selected = selectedIds.includes(task.id);
          
          // Get first 2 tags
          const tags = task.labels?.slice(0, 2) || [];
          const extraTagCount = (task.labels?.length || 0) - 2;
          
          // Description preview
          const descPreview = stripHtml(task.description || '').slice(0, 80);

          // Status styling
          const statusStyle = statusColors[task.status] || statusColors.Pending;

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
              <div className="w-[28%] min-w-0 pl-2">
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

              {/* Entity */}
              <div className="w-[8%] flex-shrink-0 hidden xl:block px-1">
                <span className="text-metadata text-muted-foreground truncate block">
                  {task.entity || '—'}
                </span>
              </div>

              {/* Status Badge */}
              <div className="w-[7%] flex-shrink-0 hidden lg:block px-1">
                <Badge 
                  variant="outline" 
                  className={cn("text-[10px] px-1.5 h-5 font-medium", statusStyle)}
                >
                  {task.status || 'Pending'}
                </Badge>
              </div>

              {/* Tags - show 2 max */}
              <div className="w-[10%] flex-shrink-0 hidden lg:flex items-center gap-1 px-1">
                {tags.length > 0 ? (
                  <>
                    {tags.map((tag: string) => {
                      const tagDef = TASK_TAGS.find(t => t.value === tag);
                      return (
                        <Badge 
                          key={tag}
                          variant="outline" 
                          className={cn("text-[10px] px-1.5 h-5 truncate max-w-[48px]", tagDef?.color)}
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
              <div className="w-[12%] flex-shrink-0 hidden md:block px-1">
                <span className="text-body-sm text-muted-foreground truncate block">
                  {getAssigneeName(task) || '—'}
                </span>
              </div>

              {/* Created Date */}
              <div className="w-16 flex-shrink-0 hidden 2xl:block px-1">
                <span className="text-metadata text-muted-foreground truncate block">
                  {task.created_at ? format(new Date(task.created_at), 'MMM d') : '—'}
                </span>
              </div>

              {/* Age */}
              <div className="w-12 flex-shrink-0 hidden 2xl:block px-1">
                <span className="text-metadata text-muted-foreground truncate block tabular-nums">
                  {getTaskAge(task.created_at)}
                </span>
              </div>

              {/* Last Updated */}
              <div className="w-16 flex-shrink-0 hidden xl:block px-1">
                <span className="text-metadata text-muted-foreground truncate block">
                  {getRelativeTime(task.updated_at)}
                </span>
              </div>

              {/* Due Date */}
              <div className={cn(
                "w-14 flex-shrink-0 text-right text-metadata tabular-nums",
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