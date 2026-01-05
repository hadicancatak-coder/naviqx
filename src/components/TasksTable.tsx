import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useTaskMutations } from "@/hooks/useTaskMutations";
import { UnifiedTaskDialog } from "./UnifiedTaskDialog";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MoreVertical, Trash2, CheckCircle, Copy, Loader2, AlertTriangle, Circle, ChevronDown, ChevronRight } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { format, isToday, isTomorrow, isPast, differenceInDays, isThisWeek, isFuture } from "date-fns";
import { cn } from "@/lib/utils";
import { 
  TASK_STATUS_OPTIONS, 
  TASK_TAG_OPTIONS, 
  TASK_STATUS_CONFIG, 
  TASK_PRIORITY_CONFIG,
  getStatusConfig,
  getTagConfig,
  mapStatusToDb, 
  mapStatusToUi 
} from "@/domain";

interface TasksTableProps {
  tasks: any[];
  onTaskUpdate: () => void;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  groupBy?: 'none' | 'dueDate' | 'priority' | 'assignee' | 'tags';
  onTaskClick?: (taskId: string, task?: any) => void;
}

const priorityConfig = {
  High: { color: "text-destructive", dot: "bg-destructive" },
  Medium: { color: "text-warning", dot: "bg-warning" },
  Low: { color: "text-muted-foreground", dot: "bg-muted-foreground" },
};

export const TasksTable = ({ tasks, onTaskUpdate, selectedIds = [], onSelectionChange, groupBy = 'none', onTaskClick }: TasksTableProps) => {
  const { toast } = useToast();
  const { user, userRole } = useAuth();
  const queryClient = useQueryClient();
  const { updateStatus, updatePriority, completeTask } = useTaskMutations();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [profiles, setProfiles] = useState<any[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [processingTaskId, setProcessingTaskId] = useState<string | null>(null);
  const [processingAction, setProcessingAction] = useState<'complete' | 'duplicate' | null>(null);

  const deleteMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", taskId);
      if (error) throw error;
    },
    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      const previousTasks = queryClient.getQueryData(['tasks']);
      queryClient.setQueryData(['tasks'], (old: any) => 
        old?.filter((task: any) => task.id !== taskId)
      );
      return { previousTasks };
    },
    onError: (error: any, taskId, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks'], context.previousTasks);
      }
      toast({ 
        title: "Error deleting task", 
        description: error.message, 
        variant: "destructive" 
      });
    },
    onSuccess: () => {
      toast({ title: "Task deleted successfully" });
      setShowDeleteConfirm(null);
      setOpenDropdownId(null);
    },
  });

  // Collapsed groups state
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    const { data } = await supabase.from("profiles").select("user_id, name, avatar_url");
    setProfiles(data || []);
  };

  // Group tasks based on groupBy prop
  const groupedTasks = useMemo(() => {
    if (groupBy === 'none') return null;

    const groups: Record<string, { label: string; tasks: any[]; order: number }> = {};

    tasks.forEach((task) => {
      let groupKey: string;
      let groupLabel: string;
      let order: number = 0;

      switch (groupBy) {
        case 'dueDate':
          if (!task.due_at) {
            groupKey = 'no-date';
            groupLabel = 'No Due Date';
            order = 99;
          } else {
            const dueDate = new Date(task.due_at);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            if (isPast(dueDate) && !isToday(dueDate)) {
              groupKey = 'overdue';
              groupLabel = 'Overdue';
              order = 0;
            } else if (isToday(dueDate)) {
              groupKey = 'today';
              groupLabel = 'Today';
              order = 1;
            } else if (isTomorrow(dueDate)) {
              groupKey = 'tomorrow';
              groupLabel = 'Tomorrow';
              order = 2;
            } else if (isThisWeek(dueDate)) {
              groupKey = 'this-week';
              groupLabel = 'This Week';
              order = 3;
            } else {
              groupKey = 'later';
              groupLabel = 'Later';
              order = 4;
            }
          }
          break;

        case 'priority':
          groupKey = task.priority || 'Low';
          groupLabel = task.priority || 'Low';
          order = task.priority === 'High' ? 0 : task.priority === 'Medium' ? 1 : 2;
          break;

        case 'assignee':
          if (!task.assignees || task.assignees.length === 0) {
            groupKey = 'unassigned';
            groupLabel = 'Unassigned';
            order = 99;
          } else {
            const assigneeName = task.assignees[0]?.name || 'Unknown';
            groupKey = assigneeName;
            groupLabel = assigneeName;
            order = 0;
          }
          break;

        case 'tags':
          if (!task.labels || task.labels.length === 0) {
            groupKey = 'untagged';
            groupLabel = 'Untagged';
            order = 99;
          } else {
            groupKey = task.labels[0];
            const tagDef = TASK_TAG_OPTIONS.find(t => t.value === task.labels[0]);
            groupLabel = tagDef?.label || task.labels[0];
            order = 0;
          }
          break;

        default:
          groupKey = 'default';
          groupLabel = 'Tasks';
          order = 0;
      }

      if (!groups[groupKey]) {
        groups[groupKey] = { label: groupLabel, tasks: [], order };
      }
      groups[groupKey].tasks.push(task);
    });

    // Sort groups by order
    return Object.entries(groups)
      .sort(([, a], [, b]) => a.order - b.order)
      .map(([key, value]) => ({ key, ...value }));
  }, [tasks, groupBy]);

  const toggleGroup = (groupKey: string) => {
    setCollapsedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupKey)) {
        newSet.delete(groupKey);
      } else {
        newSet.add(groupKey);
      }
      return newSet;
    });
  };

  const isOverdue = (dueDate: string | null, status: string) => {
    if (!dueDate || status === 'Completed' || status === 'Backlog') return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(dueDate) < today;
  };

  const isDueToday = (dueDate: string | null) => {
    if (!dueDate) return false;
    return isToday(new Date(dueDate));
  };

  const getRowClasses = (task: any) => {
    const base = "bg-card hover:bg-card-hover transition-all";
    if (isOverdue(task.due_at, task.status)) {
      return `${base} border-l-4 border-l-destructive`;
    }
    if (task.status === "Blocked") {
      return `${base} border-l-4 border-l-warning`;
    }
    if (isDueToday(task.due_at)) {
      return `${base} border-l-4 border-l-primary`;
    }
    return base;
  };

  const getDueDateDisplay = (dueDate: string | null, status: string) => {
    if (!dueDate) return null;
    const date = new Date(dueDate);
    const overdue = isOverdue(dueDate, status);
    const today = isToday(date);
    const tomorrow = isTomorrow(date);
    const daysDiff = differenceInDays(date, new Date());

    let label = format(date, "MMM dd");
    let subLabel = "";
    let colorClass = "text-foreground";

    if (overdue) {
      const daysAgo = Math.abs(daysDiff);
      subLabel = daysAgo === 1 ? "Yesterday" : `${daysAgo}d ago`;
      colorClass = "text-destructive";
    } else if (today) {
      subLabel = "Today";
      colorClass = "text-primary";
    } else if (tomorrow) {
      subLabel = "Tomorrow";
      colorClass = "text-warning";
    } else if (daysDiff <= 7) {
      subLabel = `${daysDiff}d`;
    }

    return { label, subLabel, colorClass };
  };

  const getTagBadges = (labels: string[] | null) => {
    if (!labels || labels.length === 0) return null;
    const maxDisplay = 2;
    const displayTags = labels.slice(0, maxDisplay);
    const remaining = labels.length - maxDisplay;

    return (
      <div className="flex items-center gap-1 flex-wrap">
        {displayTags.map((label) => {
          const tagDef = TASK_TAG_OPTIONS.find(t => t.value === label);
          return (
            <Badge
              key={label}
              variant="outline"
              className={cn(
                "text-metadata px-1.5 py-0 h-5 font-medium border",
                getTagConfig(label).className
              )}
            >
              {tagDef?.label || label}
            </Badge>
          );
        })}
        {remaining > 0 && (
          <span className="text-metadata text-muted-foreground">+{remaining}</span>
        )}
      </div>
    );
  };

  const handleRowClick = (taskId: string, task?: any) => {
    if (onTaskClick) {
      onTaskClick(taskId, task);
    } else {
      setSelectedTaskId(taskId);
      setDialogOpen(true);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (showDeleteConfirm) {
      deleteMutation.mutate(showDeleteConfirm);
    }
  };

  // Render a single task row
  const renderTaskRow = (task: any) => {
    const dueDateInfo = getDueDateDisplay(task.due_at, task.status);
    const priority = priorityConfig[task.priority as keyof typeof priorityConfig] || priorityConfig.Low;
    const status = getStatusConfig(task.status);

    return (
      <TableRow
        key={task.id}
        className={cn(
          "cursor-pointer h-16",
          getRowClasses(task),
          task.pending_approval && 'border-l-4 border-l-primary'
        )}
        onClick={() => handleRowClick(task.id, task)}
      >
        <TableCell className="py-5 px-4" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={selectedIds?.includes(task.id) || false}
            onCheckedChange={(checked) => {
              onSelectionChange?.(
                checked 
                  ? [...(selectedIds || []), task.id]
                  : (selectedIds || []).filter(id => id !== task.id)
              );
            }}
          />
        </TableCell>
        <TableCell
          className="py-5 px-4"
          onDoubleClick={(e) => {
            e.stopPropagation();
            setEditingTaskId(task.id);
            setEditValue(task.title);
          }}
        >
          {editingTaskId === task.id ? (
            <Input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={async () => {
                await supabase.from('tasks').update({ title: editValue }).eq('id', task.id);
                setEditingTaskId(null);
                onTaskUpdate();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur();
                if (e.key === 'Escape') setEditingTaskId(null);
              }}
              autoFocus
              onClick={(e) => e.stopPropagation()}
              className="border-border"
            />
          ) : (
            <div className="flex flex-col gap-1 min-w-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <Circle className={cn("h-2.5 w-2.5 flex-shrink-0 fill-current", priority.dot, priority.color)} />
                {isOverdue(task.due_at, task.status) && (
                  <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
                )}
                <span className="text-body-sm font-medium text-foreground truncate">{task.title}</span>
                {task.pending_approval && (
                  <Badge variant="default" className="text-metadata px-2 py-0 h-5 flex-shrink-0">
                    Pending
                  </Badge>
                )}
                {task.comments_count > 0 && (
                  <Badge variant="outline" className="text-metadata px-1.5 py-0 h-5 flex items-center gap-1 flex-shrink-0 border-border">
                    <span>💬</span>
                    <span>{task.comments_count}</span>
                  </Badge>
                )}
              </div>
              {/* Description preview */}
              {task.description && (
                <span className="text-metadata text-muted-foreground truncate max-w-[280px]">
                  {task.description.replace(/<[^>]*>/g, '').substring(0, 50)}
                  {task.description.length > 50 ? '...' : ''}
                </span>
              )}
            </div>
          )}
        </TableCell>
        <TableCell className="py-5 px-3">
          {getTagBadges(task.labels)}
        </TableCell>
        <TableCell className="py-5 px-3" onClick={(e) => e.stopPropagation()}>
          <Select
            value={task.status}
            onValueChange={(newStatus: any) => {
              updateStatus.mutate({ id: task.id, status: newStatus });
            }}
            disabled={updateStatus.isPending}
          >
            <SelectTrigger className={cn(
              "h-7 w-[90px] text-metadata font-medium rounded-full border-0",
              status.className
            )}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-border bg-popover shadow-lg">
              {TASK_STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.dbValue} className="text-body-sm">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </TableCell>
        <TableCell className="hidden md:table-cell py-5 px-3" onClick={(e) => e.stopPropagation()}>
          <Select
            value={task.priority}
            onValueChange={(newPriority: any) => {
              updatePriority.mutate({ id: task.id, priority: newPriority });
            }}
            disabled={updatePriority.isPending}
          >
            <SelectTrigger className="h-7 w-[80px] text-metadata rounded-full border-border bg-card">
              <div className="flex items-center gap-1.5">
                <Circle className={cn("h-2 w-2 fill-current", priority.dot, priority.color)} />
                <span>{task.priority}</span>
              </div>
            </SelectTrigger>
            <SelectContent className="rounded-xl border-border bg-popover shadow-lg">
              <SelectItem value="Low" className="text-body-sm">Low</SelectItem>
              <SelectItem value="Medium" className="text-body-sm">Medium</SelectItem>
              <SelectItem value="High" className="text-body-sm">High</SelectItem>
            </SelectContent>
          </Select>
        </TableCell>
        <TableCell onClick={(e) => e.stopPropagation()} className="hidden lg:table-cell py-5 px-3">
          <div 
            className="cursor-pointer hover:bg-muted/50 rounded-lg p-1.5 -m-1.5 transition-colors"
            onClick={() => handleRowClick(task.id)}
            title="Click to edit assignees"
          >
            {task.assignees && task.assignees.length > 0 ? (
              <div className="flex items-center gap-1.5">
                {task.assignees.slice(0, 3).map((assignee: any) => (
                  <Avatar key={assignee.id} className="h-7 w-7 border-2 border-background">
                    <AvatarImage src={assignee.avatar_url} />
                    <AvatarFallback className="text-metadata bg-muted text-muted-foreground">
                      {assignee.name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {task.assignees.length > 3 && (
                  <span className="text-metadata text-muted-foreground ml-0.5">
                    +{task.assignees.length - 3}
                  </span>
                )}
              </div>
            ) : (
              <span className="text-body-sm text-muted-foreground hover:text-foreground">+ Add</span>
            )}
          </div>
        </TableCell>
        <TableCell className="py-5 px-3" onClick={(e) => e.stopPropagation()}>
          <div 
            className="cursor-pointer hover:bg-muted/50 rounded-lg p-1.5 -m-1.5 transition-colors"
            onClick={() => handleRowClick(task.id)}
            title="Click to edit due date"
          >
            {dueDateInfo ? (
              <div className={cn("flex flex-col", dueDateInfo.colorClass)}>
                <span className="text-body-sm font-medium">{dueDateInfo.label}</span>
                {dueDateInfo.subLabel && (
                  <span className="text-metadata">{dueDateInfo.subLabel}</span>
                )}
              </div>
            ) : (
              <span className="text-body-sm text-muted-foreground">No date</span>
            )}
          </div>
        </TableCell>
        <TableCell className="py-5 px-2" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu open={openDropdownId === task.id} onOpenChange={(open) => setOpenDropdownId(open ? task.id : null)}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm">
                <MoreVertical />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setProcessingTaskId(task.id);
                  setProcessingAction('complete');
                  completeTask.mutate(task.id, {
                    onSettled: () => {
                      setProcessingTaskId(null);
                      setProcessingAction(null);
                    }
                  });
                }}
                disabled={processingTaskId !== null}
              >
                {processingTaskId === task.id && processingAction === 'complete' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Completing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Mark Completed
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setProcessingTaskId(task.id);
                  setProcessingAction('duplicate');
                  try {
                    const { data: newTask, error } = await supabase
                      .from('tasks')
                      .insert({
                        title: `${task.title} (Copy)`,
                        description: task.description,
                        priority: task.priority,
                        status: 'Pending',
                        due_at: task.due_at,
                        labels: task.labels,
                        entity: task.entity,
                        created_by: user?.id,
                      })
                      .select()
                      .single();
                    
                    if (error) throw error;
                    
                    // Copy assignees
                    if (task.assignees?.length > 0) {
                      const { data: creatorProfile } = await supabase
                        .from("profiles")
                        .select("id")
                        .eq("user_id", user!.id)
                        .single();
                        
                      if (creatorProfile) {
                        await supabase.from('task_assignees').insert(
                          task.assignees.map((a: any) => ({
                            task_id: newTask.id,
                            user_id: a.id,
                            assigned_by: creatorProfile.id,
                          }))
                        );
                      }
                    }
                    
                    queryClient.invalidateQueries({ queryKey: ['tasks'] });
                    toast({ title: "Task duplicated successfully" });
                  } catch (error: any) {
                    toast({ title: "Error duplicating task", description: error.message, variant: "destructive" });
                  } finally {
                    setProcessingTaskId(null);
                    setProcessingAction(null);
                    setOpenDropdownId(null);
                  }
                }}
                disabled={processingTaskId !== null}
              >
                {processingTaskId === task.id && processingAction === 'duplicate' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Duplicating...
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    Duplicate
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowDeleteConfirm(task.id);
                }}
                disabled={processingTaskId !== null}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>
    );
  };

  return (
    <>
      <div className="w-full overflow-hidden">
        <Table className="w-full table-fixed">
          <TableHeader>
            <TableRow className="bg-muted/50 border-b border-border">
              <TableHead className="w-[44px] py-4 px-4">
                <Checkbox
                  checked={selectedIds?.length === tasks.length && tasks.length > 0}
                  onCheckedChange={(checked) => {
                    onSelectionChange?.(checked ? tasks.map(t => t.id) : []);
                  }}
                />
              </TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground py-4 px-4" style={{ width: '32%' }}>Task</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground py-4 px-3" style={{ width: '120px' }}>Tags</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground py-4 px-3" style={{ width: '100px' }}>Status</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground py-4 px-3 hidden md:table-cell" style={{ width: '90px' }}>Priority</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground py-4 px-3 hidden lg:table-cell" style={{ width: '110px' }}>Assignee</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wide text-muted-foreground py-4 px-3" style={{ width: '100px' }}>Due Date</TableHead>
              <TableHead className="py-4 px-2" style={{ width: '50px' }}></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-border/50">
            {groupBy !== 'none' && groupedTasks ? (
              // Grouped view - render groups with manual expand/collapse
              groupedTasks.map((group) => (
                <>
                  <TableRow 
                    key={`group-header-${group.key}`}
                    className="bg-muted/30 hover:bg-muted/50 cursor-pointer border-y border-border"
                    onClick={() => toggleGroup(group.key)}
                  >
                    <TableCell colSpan={8} className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {collapsedGroups.has(group.key) ? (
                          <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform" />
                        )}
                        <span className="font-semibold text-body-sm">{group.label}</span>
                        <Badge variant="secondary" className="text-metadata">
                          {group.tasks.length}
                        </Badge>
                      </div>
                    </TableCell>
                  </TableRow>
                  {!collapsedGroups.has(group.key) && group.tasks.map((task) => renderTaskRow(task))}
                </>
              ))
            ) : (
              // Flat view
              tasks.map((task) => renderTaskRow(task))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal dialog fallback - only when onTaskClick is not provided */}
      {selectedTaskId && !onTaskClick && (
        <UnifiedTaskDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          mode="view"
          taskId={selectedTaskId}
        />
      )}

      <AlertDialog open={showDeleteConfirm !== null} onOpenChange={(open) => !open && setShowDeleteConfirm(null)}>
        <AlertDialogContent className="z-overlay" onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {userRole === 'admin' 
                ? 'This will permanently delete this task. This action cannot be undone.'
                : 'This will send a delete request to an admin for review.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              disabled={deleteMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Task'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
