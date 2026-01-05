import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { addDays } from "date-fns";
import { cn } from "@/lib/utils";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableTaskRow } from './SortableTaskRow';

interface TaskBoardViewProps {
  tasks: any[];
  onTaskClick: (taskId: string) => void;
  groupBy?: 'status' | 'date' | 'assignee';
}

export const TaskBoardView = ({ tasks, onTaskClick, groupBy = 'status' }: TaskBoardViewProps) => {
  const { userRole } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [processingAction, setProcessingAction] = useState<{ taskId: string; action: 'complete' | 'duplicate' | 'delete' } | null>(null);
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );
  
  // Status groups - using Backlog instead of Pending
  const statusGroups = ['Backlog', 'Ongoing', 'Blocked', 'Completed', 'Failed'];
  const dateGroups = ['Overdue', 'Today', 'Tomorrow', 'This Week', 'Later'];
  
  // Dynamic assignee groups from tasks
  const assigneeGroups = useMemo(() => {
    const assignees = new Map<string, string>();
    tasks.forEach(task => {
      if (task.assignees && task.assignees.length > 0) {
        task.assignees.forEach((a: any) => {
          const id = a.user_id || a.id;
          const name = a.name || 'Unknown';
          if (id && !assignees.has(id)) {
            assignees.set(id, name);
          }
        });
      }
    });
    return [...Array.from(assignees.values()), 'Unassigned'];
  }, [tasks]);
  
  const groups = groupBy === 'status' ? statusGroups : groupBy === 'date' ? dateGroups : assigneeGroups;

  const getDateGroup = (task: any): string => {
    if (!task.due_at) return 'Later';
    const dueDate = new Date(task.due_at);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const weekFromNow = new Date(today);
    weekFromNow.setDate(weekFromNow.getDate() + 7);

    if (dueDate < today && task.status !== 'Completed') return 'Overdue';
    if (dueDate.toDateString() === today.toDateString()) return 'Today';
    if (dueDate.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    if (dueDate <= weekFromNow) return 'This Week';
    return 'Later';
  };

  const getAssigneeGroup = (task: any): string => {
    if (!task.assignees || task.assignees.length === 0) return 'Unassigned';
    // Return the first assignee's name
    return task.assignees[0]?.name || 'Unknown';
  };

  const filterTasksByGroup = (group: string) => {
    if (groupBy === 'status') {
      // Handle Backlog mapping - DB stores 'Pending', UI shows 'Backlog'
      if (group === 'Backlog') {
        return tasks.filter(t => t.status === 'Pending' || t.status === 'Backlog');
      }
      return tasks.filter(t => t.status === group);
    } else if (groupBy === 'date') {
      return tasks.filter(t => getDateGroup(t) === group);
    } else {
      return tasks.filter(t => getAssigneeGroup(t) === group);
    }
  };

  const handleComplete = async (task: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setProcessingAction({ taskId: task.id, action: 'complete' });
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: 'Completed' })
        .eq('id', task.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Task marked as completed",
      });

      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessingAction(null);
    }
  };

  const handleDuplicate = async (task: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setProcessingAction({ taskId: task.id, action: 'duplicate' });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const { data: duplicatedTask, error } = await supabase
        .from('tasks')
        .insert({
          ...task,
          id: undefined,
          title: `${task.title} (Copy)`,
          created_by: user.id,
          created_at: undefined,
          updated_at: undefined,
        })
        .select()
        .single();

      if (error) throw error;

      if (task.assignees?.length > 0 && duplicatedTask) {
        const assigneeInserts = task.assignees.map((assignee: any) => ({
          task_id: duplicatedTask.id,
          user_id: assignee.user_id,
          assigned_by: user.id,
        }));

        await supabase.from('task_assignees').insert(assigneeInserts);
      }

      toast({
        title: "Success",
        description: "Task duplicated successfully",
      });

      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessingAction(null);
    }
  };

  const handleDelete = async (task: any, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setProcessingAction({ taskId: task.id, action: 'delete' });
    try {
      if (userRole === 'admin') {
        const { error } = await supabase
          .from('tasks')
          .delete()
          .eq('id', task.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Task deleted successfully",
        });
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("No user found");

        const { error } = await supabase
          .from('tasks')
          .update({
            delete_requested_by: user.id,
            delete_requested_at: new Date().toISOString(),
          })
          .eq('id', task.id);

        if (error) throw error;

        toast({
          title: "Delete Request Sent",
          description: "Admin will review your request",
        });
      }

      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setShowDeleteConfirm(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessingAction(null);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;
    
    const taskId = active.id as string;
    const targetGroup = over.id as string;
    
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    try {
      if (groupBy === 'status') {
        // Map Backlog to Pending for DB
        const dbStatus = targetGroup === 'Backlog' ? 'Pending' : targetGroup;
        await supabase
          .from('tasks')
          .update({ status: dbStatus as 'Pending' | 'Ongoing' | 'Blocked' | 'Completed' | 'Failed' })
          .eq('id', taskId);
        
        toast({
          title: "Task moved",
          description: `Task moved to ${targetGroup}`,
        });
      } else if (groupBy === 'date') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        let newDate: Date;
        
        switch (targetGroup) {
          case 'Today':
            newDate = today;
            break;
          case 'Tomorrow':
            newDate = addDays(today, 1);
            break;
          case 'This Week':
            newDate = addDays(today, 3);
            break;
          case 'Later':
            newDate = addDays(today, 14);
            break;
          default:
            return;
        }
        
        await supabase
          .from('tasks')
          .update({ due_at: newDate.toISOString() })
          .eq('id', taskId);
        
        toast({
          title: "Due date updated",
          description: `Task moved to ${targetGroup}`,
        });
      }
      // Note: Assignee drag-drop would need to update task_assignees table
      
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getColumnCount = () => {
    if (groupBy === 'assignee') {
      return Math.min(groups.length, 6);
    }
    return groups.length;
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div 
        className="grid gap-md"
        style={{
          gridTemplateColumns: `repeat(${getColumnCount()}, minmax(200px, 1fr))`
        }}
      >
        {groups.map(group => {
          const groupTasks = filterTasksByGroup(group);
          const taskIds = groupTasks.map(t => t.id);
          
          return (
            <SortableContext key={group} id={group} items={taskIds} strategy={verticalListSortingStrategy}>
              <div className="flex flex-col min-h-[400px]">
                {/* Column Header */}
                <div className="flex items-center justify-between py-2 px-1 mb-2 border-b border-border">
                  <h3 className="font-semibold text-body-sm text-foreground">{group}</h3>
                  <Badge variant="secondary" className="text-metadata h-5 px-1.5">
                    {groupTasks.length}
                  </Badge>
                </div>
                
                {/* Column Content */}
                <ScrollArea className="flex-1">
                  <div className="space-y-1.5">
                    {groupTasks.length === 0 ? (
                      <div className="py-8 text-center text-muted-foreground text-metadata rounded-lg border border-dashed border-border">
                        No tasks
                      </div>
                    ) : (
                      groupTasks.map(task => (
                        <div 
                          key={task.id} 
                          className="rounded-lg bg-card border border-border hover:border-primary/30 hover:shadow-sm transition-smooth"
                        >
                          <SortableTaskRow
                            task={task}
                            onClick={onTaskClick}
                            onComplete={(taskId, completed) => {
                              if (completed) handleComplete({ id: taskId } as any, { stopPropagation: () => {} } as any);
                            }}
                            onDuplicate={handleDuplicate}
                            onDelete={(taskId) => setShowDeleteConfirm(taskId)}
                            processingAction={processingAction}
                            userRole={userRole}
                            compact
                          />
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            </SortableContext>
          );
        })}
      </div>

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
              disabled={processingAction?.action === 'delete'}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                const task = tasks.find(t => t.id === showDeleteConfirm);
                if (task) handleDelete(task, e);
              }}
              disabled={processingAction?.action === 'delete'}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {processingAction?.action === 'delete' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {userRole === 'admin' ? 'Deleting...' : 'Requesting...'}
                </>
              ) : (
                userRole === 'admin' ? 'Delete Task' : 'Request Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DndContext>
  );
};
