import { useState, useMemo, useRef, useCallback } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, CheckCircle, Copy, Trash2, ChevronUp, ChevronDown, GripVertical } from "lucide-react";
import { format, formatDistanceToNow, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { TASK_TAGS } from "@/lib/constants";
import { useTaskMutations } from "@/hooks/useTaskMutations";
import { RecurringCompletionToggle } from "@/components/tasks/RecurringCompletionToggle";
type SortField = 'title' | 'entity' | 'status' | 'tags' | 'assignee' | 'created_at' | 'updated_at' | 'due_at';
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

// Default column widths in pixels
const DEFAULT_WIDTHS = {
  checkbox: 32,
  priority: 16,
  task: 280,
  entity: 100,
  status: 90,
  tags: 200,
  assignee: 140,
  created: 80,
  age: 56,
  updated: 80,
  due: 72,
  actions: 40,
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
  const { updateStatus } = useTaskMutations();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortField | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [columnWidths, setColumnWidths] = useState(DEFAULT_WIDTHS);
  const resizingRef = useRef<{ column: keyof typeof DEFAULT_WIDTHS; startX: number; startWidth: number } | null>(null);

  const allSelected = tasks.length > 0 && selectedIds.length === tasks.length;

  const toggleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const handleResizeStart = useCallback((column: keyof typeof DEFAULT_WIDTHS, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resizingRef.current = {
      column,
      startX: e.clientX,
      startWidth: columnWidths[column],
    };
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizingRef.current) return;
      const diff = e.clientX - resizingRef.current.startX;
      const newWidth = Math.max(40, resizingRef.current.startWidth + diff);
      setColumnWidths(prev => ({
        ...prev,
        [resizingRef.current!.column]: newWidth,
      }));
    };

    const handleMouseUp = () => {
      resizingRef.current = null;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [columnWidths]);

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
          // entity can be string or array
          const aEntity = Array.isArray(a.entity) ? a.entity[0] : a.entity;
          const bEntity = Array.isArray(b.entity) ? b.entity[0] : b.entity;
          aVal = (aEntity || '').toLowerCase();
          bVal = (bEntity || '').toLowerCase();
          break;
        case 'status':
          aVal = a.status?.toLowerCase() || '';
          bVal = b.status?.toLowerCase() || '';
          break;
        case 'tags':
          aVal = a.labels?.[0]?.toLowerCase() || '';
          bVal = b.labels?.[0]?.toLowerCase() || '';
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

  const handleComplete = (task: any, e: React.MouseEvent) => {
    e.stopPropagation();
    // Skip standard completion for recurring tasks - they use daily toggle
    const isRecurring = task.recurrence_rrule || task.task_type === 'recurring';
    if (isRecurring) {
      return; // Recurring tasks handled by RecurringCompletionToggle
    }
    setProcessingId(task.id);
    const newStatus = task.status === 'Completed' ? 'Pending' : 'Completed';
    updateStatus.mutate(
      { id: task.id, status: newStatus },
      { onSettled: () => setProcessingId(null) }
    );
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

  const getAssigneeName = (task: any) => {
    if (!task.assignees || task.assignees.length === 0) return null;
    const first = task.assignees[0];
    const name = first.name || first.username || 'Unknown';
    if (task.assignees.length > 1) {
      return `${name} +${task.assignees.length - 1}`;
    }
    return name;
  };

  const getRelativeTime = (date: string) => {
    if (!date) return '—';
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: false });
    } catch {
      return '—';
    }
  };

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
        "flex items-center gap-0.5 hover:text-foreground transition-colors text-left",
        sortBy === field && "text-foreground",
        className
      )}
    >
      <span className="truncate">{children}</span>
      {sortBy === field ? (
        sortOrder === 'asc' 
          ? <ChevronUp className="h-3.5 w-3.5 flex-shrink-0" /> 
          : <ChevronDown className="h-3.5 w-3.5 flex-shrink-0" />
      ) : (
        <ChevronUp className="h-3.5 w-3.5 flex-shrink-0 opacity-0 group-hover:opacity-30" />
      )}
    </button>
  );

  const ResizeHandle = ({ column }: { column: keyof typeof DEFAULT_WIDTHS }) => (
    <div
      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 active:bg-primary z-10"
      onMouseDown={(e) => handleResizeStart(column, e)}
    />
  );

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card">
      {/* Header */}
      <div className="flex items-center h-10 px-3 bg-muted/50 border-b border-border text-body-sm font-medium text-muted-foreground tracking-wide">
        <div style={{ width: columnWidths.checkbox }} className="flex-shrink-0">
          <Checkbox
            checked={allSelected}
            onCheckedChange={handleSelectAll}
            className="h-4 w-4"
          />
        </div>
        <div style={{ width: columnWidths.priority }} className="flex-shrink-0" />
        
        <div style={{ minWidth: columnWidths.task }} className="flex-1 min-w-0 pl-2 relative group">
          <SortHeader field="title">Task</SortHeader>
          <ResizeHandle column="task" />
        </div>
        
        <div style={{ width: columnWidths.entity }} className="flex-shrink-0 hidden xl:block relative group">
          <SortHeader field="entity">Entity</SortHeader>
          <ResizeHandle column="entity" />
        </div>
        
        <div style={{ width: columnWidths.status }} className="flex-shrink-0 hidden lg:block relative group">
          <SortHeader field="status">Status</SortHeader>
          <ResizeHandle column="status" />
        </div>
        
        <div style={{ width: columnWidths.tags }} className="flex-shrink-0 hidden lg:block relative group">
          <SortHeader field="tags">Tags</SortHeader>
          <ResizeHandle column="tags" />
        </div>
        
        <div style={{ width: columnWidths.assignee }} className="flex-shrink-0 hidden md:block relative group">
          <SortHeader field="assignee">Assignee</SortHeader>
          <ResizeHandle column="assignee" />
        </div>
        
        <div style={{ width: columnWidths.created }} className="flex-shrink-0 hidden 2xl:block relative group">
          <SortHeader field="created_at">Created</SortHeader>
          <ResizeHandle column="created" />
        </div>
        
        <div style={{ width: columnWidths.age }} className="flex-shrink-0 hidden 2xl:block relative group">
          <span>Age</span>
          <ResizeHandle column="age" />
        </div>
        
        <div style={{ width: columnWidths.updated }} className="flex-shrink-0 hidden xl:block relative group">
          <SortHeader field="updated_at">Updated</SortHeader>
          <ResizeHandle column="updated" />
        </div>
        
        <div style={{ width: columnWidths.due }} className="flex-shrink-0 text-right relative group">
          <SortHeader field="due_at" className="justify-end w-full">Due</SortHeader>
          <ResizeHandle column="due" />
        </div>
        
        <div style={{ width: columnWidths.actions }} className="flex-shrink-0" />
      </div>

      {/* Rows */}
      <div>
        {sortedTasks.map((task, index) => {
          const completed = task.status === 'Completed';
          const overdue = isOverdue(task);
          const focused = index === focusedIndex;
          const selected = selectedIds.includes(task.id);
          
          const tags = task.labels?.slice(0, 2) || [];
          const extraTagCount = (task.labels?.length || 0) - 2;
          
          const descPreview = stripHtml(task.description || '').slice(0, 80);
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
                focused && "ring-1 ring-inset ring-primary/50 bg-primary/5"
              )}
            >
              {/* Selection Checkbox */}
              <div style={{ width: columnWidths.checkbox }} className="flex-shrink-0 flex items-center gap-1">
                <Checkbox
                  checked={selected}
                  onCheckedChange={(checked) => handleSelect(task.id, checked as boolean, { stopPropagation: () => {} } as any)}
                  onClick={(e) => handleSelect(task.id, !selected, e)}
                  className="h-4 w-4"
                />
                {/* Completion toggle - smart for recurring */}
                {(task.recurrence_rrule || task.task_type === 'recurring') ? (
                  <RecurringCompletionToggle taskId={task.id} compact className="flex-shrink-0" />
                ) : (
                  <Checkbox
                    checked={completed}
                    onCheckedChange={() => handleComplete(task, { stopPropagation: () => {} } as any)}
                    onClick={(e) => e.stopPropagation()}
                    className={cn("h-4 w-4", completed && "bg-success border-success")}
                  />
                )}
              </div>

              {/* Priority Dot */}
              <div style={{ width: columnWidths.priority }} className="flex-shrink-0 flex justify-center">
                <div
                  className={cn(
                    "w-2.5 h-2.5 rounded-full",
                    priorityColors[task.priority] || "bg-muted-foreground/40"
                  )}
                  title={task.priority}
                />
              </div>

              {/* Task Title + Description */}
              <div style={{ minWidth: columnWidths.task }} className="flex-1 min-w-0 pl-2 pr-2">
                <div className={cn(
                  "truncate text-body-sm font-medium leading-tight",
                  completed && "line-through text-muted-foreground"
                )}>
                  {task.title}
                </div>
                {descPreview && (
                  <div className="truncate text-body-sm text-muted-foreground/70 leading-tight">
                    {descPreview}
                  </div>
                )}
              </div>

              {/* Entity */}
              <div style={{ width: columnWidths.entity }} className="flex-shrink-0 hidden xl:block px-1">
                <span className="text-body-sm text-muted-foreground truncate block">
                  {Array.isArray(task.entity) ? task.entity[0] : task.entity || '—'}
                </span>
              </div>

              {/* Status Badge */}
              <div style={{ width: columnWidths.status }} className="flex-shrink-0 hidden lg:block px-1">
                <Badge 
                  variant="outline" 
                  className={cn("text-body-sm px-2 h-6 font-medium", statusStyle)}
                >
                  {task.status || 'Pending'}
                </Badge>
              </div>

              {/* Tags */}
              <div style={{ width: columnWidths.tags }} className="flex-shrink-0 hidden lg:flex items-center gap-1 px-1 overflow-hidden">
                {tags.length > 0 ? (
                  <>
                    {tags.map((tag: string) => {
                      const tagDef = TASK_TAGS.find(t => t.value.toLowerCase() === tag.toLowerCase());
                      return (
                        <Badge 
                          key={tag}
                          variant="outline" 
                          className={cn(
                            "text-metadata px-2 py-0.5 whitespace-nowrap",
                            tagDef?.color || "bg-muted text-muted-foreground border-border"
                          )}
                        >
                          {tagDef?.label || tag}
                        </Badge>
                      );
                    })}
                    {extraTagCount > 0 && (
                      <span className="text-body-sm text-muted-foreground">+{extraTagCount}</span>
                    )}
                  </>
                ) : (
                  <span className="text-muted-foreground text-body-sm">—</span>
                )}
              </div>

              {/* Assignee */}
              <div style={{ width: columnWidths.assignee }} className="flex-shrink-0 hidden md:block px-1">
                <span className="text-body-sm text-muted-foreground truncate block">
                  {getAssigneeName(task) || '—'}
                </span>
              </div>

              {/* Created Date */}
              <div style={{ width: columnWidths.created }} className="flex-shrink-0 hidden 2xl:block px-1">
                <span className="text-body-sm text-muted-foreground truncate block">
                  {task.created_at ? format(new Date(task.created_at), 'MMM d') : '—'}
                </span>
              </div>

              {/* Age */}
              <div style={{ width: columnWidths.age }} className="flex-shrink-0 hidden 2xl:block px-1">
                <span className="text-body-sm text-muted-foreground truncate block tabular-nums">
                  {getTaskAge(task.created_at)}
                </span>
              </div>

              {/* Last Updated */}
              <div style={{ width: columnWidths.updated }} className="flex-shrink-0 hidden xl:block px-1">
                <span className="text-body-sm text-muted-foreground truncate block">
                  {getRelativeTime(task.updated_at)}
                </span>
              </div>

              {/* Due Date */}
              <div 
                style={{ width: columnWidths.due }} 
                className={cn(
                  "flex-shrink-0 text-right text-body-sm tabular-nums",
                  overdue && !completed ? "text-destructive font-medium" : "text-muted-foreground"
                )}
              >
                {task.due_at ? format(new Date(task.due_at), 'MMM d') : '—'}
              </div>

              {/* Actions */}
              <div style={{ width: columnWidths.actions }} className="flex-shrink-0 flex justify-end">
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