import { useState, useMemo } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useTaskMutations } from "@/hooks/useTaskMutations";
import { TaskRow } from "@/components/tasks/TaskRow";
import { InlineTaskCreator } from "@/components/tasks/InlineTaskCreator";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { isPast, isToday, isTomorrow, isThisWeek } from "date-fns";
import { TASK_TAG_OPTIONS } from "@/domain";
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

interface TasksTableProps {
  tasks: any[];
  onTaskUpdate: () => void;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  groupBy?: 'none' | 'dueDate' | 'priority' | 'assignee' | 'tags';
  onTaskClick?: (taskId: string, task?: any) => void;
}

export const TasksTable = ({ 
  tasks, 
  onTaskUpdate, 
  selectedIds = [], 
  onSelectionChange, 
  groupBy = 'none', 
  onTaskClick 
}: TasksTableProps) => {
  const { toast } = useToast();
  const { user, userRole } = useAuth();
  const queryClient = useQueryClient();
  const { completeTask } = useTaskMutations();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [processingAction, setProcessingAction] = useState<{ taskId: string; action: 'complete' | 'duplicate' | 'delete' } | null>(null);

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
    onError: (error: any, _taskId, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks'], context.previousTasks);
      }
      toast({ title: "Error deleting task", description: error.message, variant: "destructive" });
    },
    onSuccess: () => {
      toast({ title: "Task deleted successfully" });
      setShowDeleteConfirm(null);
    },
  });

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

  const handleComplete = (taskId: string, completed: boolean) => {
    setProcessingAction({ taskId, action: 'complete' });
    if (completed) {
      completeTask.mutate(taskId, {
        onSettled: () => setProcessingAction(null)
      });
    } else {
      // Reopen task
      supabase.from('tasks').update({ status: 'Pending' as const }).eq('id', taskId)
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ['tasks'] });
          setProcessingAction(null);
        });
    }
  };

  const handleDuplicate = async (task: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setProcessingAction({ taskId: task.id, action: 'duplicate' });
    try {
      const { data: newTask, error } = await supabase
        .from('tasks')
        .insert({
          title: `${task.title} (Copy)`,
          description: task.description,
          priority: task.priority,
          status: 'Pending' as const,
          due_at: task.due_at,
          labels: task.labels,
          entity: task.entity,
          created_by: user?.id,
        } as any)
        .select()
        .single();
      
      if (error) throw error;
      
      // Copy assignees
      if (task.assignees?.length > 0 && newTask) {
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
      setProcessingAction(null);
    }
  };

  const handleDelete = (taskId: string) => {
    setShowDeleteConfirm(taskId);
  };

  const confirmDelete = () => {
    if (showDeleteConfirm) {
      setProcessingAction({ taskId: showDeleteConfirm, action: 'delete' });
      deleteMutation.mutate(showDeleteConfirm, {
        onSettled: () => setProcessingAction(null)
      });
    }
  };

  const handleSelect = (taskId: string, selected: boolean) => {
    onSelectionChange?.(
      selected 
        ? [...selectedIds, taskId]
        : selectedIds.filter(id => id !== taskId)
    );
  };

  const handleRowClick = (taskId: string, task?: any) => {
    onTaskClick?.(taskId, task);
  };

  const allSelected = tasks.length > 0 && selectedIds.length === tasks.length;

  const renderTaskList = (taskList: any[]) => (
    <div className="divide-y divide-border">
      {taskList.map((task) => (
        <TaskRow
          key={task.id}
          task={task}
          onClick={handleRowClick}
          onComplete={handleComplete}
          onDuplicate={handleDuplicate}
          onDelete={handleDelete}
          isSelected={selectedIds.includes(task.id)}
          onSelect={handleSelect}
          showSelectionCheckbox
          processingAction={processingAction}
          userRole={userRole}
        />
      ))}
    </div>
  );

  return (
    <>
      <div className="w-full bg-card rounded-lg border border-border overflow-hidden">
        {/* Header Row */}
        <div className="flex items-center gap-xxs h-row-compact px-sm bg-muted/50 border-b border-border">
          <Checkbox
            checked={allSelected}
            onCheckedChange={(checked) => {
              onSelectionChange?.(checked ? tasks.map(t => t.id) : []);
            }}
            className="flex-shrink-0"
          />
          <span className="text-metadata font-medium text-muted-foreground uppercase tracking-wide flex-1 ml-1">
            Task
          </span>
          <span className="text-metadata font-medium text-muted-foreground uppercase tracking-wide w-20 text-right">
            Due
          </span>
          <div className="w-6" /> {/* Spacer for actions */}
        </div>

        {/* Task Rows */}
        {groupBy !== 'none' && groupedTasks ? (
          // Grouped view
          groupedTasks.map((group) => (
            <div key={group.key}>
              <button
                onClick={() => toggleGroup(group.key)}
                className={cn(
                  "flex items-center gap-2 w-full h-row-compact px-sm",
                  "bg-muted/30 hover:bg-muted/50 transition-smooth border-b border-border"
                )}
              >
                {collapsedGroups.has(group.key) ? (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="font-medium text-body-sm">{group.label}</span>
                <Badge variant="secondary" className="text-metadata h-5">
                  {group.tasks.length}
                </Badge>
              </button>
              {!collapsedGroups.has(group.key) && renderTaskList(group.tasks)}
            </div>
          ))
        ) : (
          // Flat view
          renderTaskList(tasks)
        )}

        {/* Inline Task Creator */}
        <InlineTaskCreator onTaskCreated={onTaskUpdate} className="border-t border-border" />
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm !== null} onOpenChange={(open) => !open && setShowDeleteConfirm(null)}>
        <AlertDialogContent className="z-overlay">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task?</AlertDialogTitle>
            <AlertDialogDescription>
              {userRole === 'admin' 
                ? 'This will permanently delete this task. This action cannot be undone.'
                : 'This will send a delete request to an admin for review.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
