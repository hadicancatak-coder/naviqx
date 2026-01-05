import { useState } from "react";
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
import { TASK_TAGS } from "@/lib/constants";

interface TaskBoardViewProps {
  tasks: any[];
  onTaskClick: (taskId: string) => void;
  groupBy?: 'status' | 'date' | 'tags';
}

export const TaskBoardView = ({ tasks, onTaskClick, groupBy = 'status' }: TaskBoardViewProps) => {
  const { userRole } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [processingAction, setProcessingAction] = useState<{ taskId: string; action: 'complete' | 'duplicate' | 'delete' } | null>(null);
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );
  
  const statusGroups = ['Pending', 'Ongoing', 'Blocked', 'Completed', 'Failed'];
  const dateGroups = ['Overdue', 'Today', 'Tomorrow', 'This Week', 'Later'];
  const tagGroups = [...TASK_TAGS.map(t => t.label), 'Untagged'];
  
  const groups = groupBy === 'status' ? statusGroups : groupBy === 'date' ? dateGroups : tagGroups;

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

  const getTagGroup = (task: any): string => {
    if (!task.labels || task.labels.length === 0) return 'Untagged';
    // Find matching tag label for the first label
    const firstLabel = task.labels[0];
    const tagDef = TASK_TAGS.find(t => t.value === firstLabel);
    return tagDef ? tagDef.label : 'Untagged';
  };

  const filterTasksByGroup = (group: string) => {
    if (groupBy === 'status') {
      return tasks.filter(t => t.status === group);
    } else if (groupBy === 'date') {
      return tasks.filter(t => getDateGroup(t) === group);
    } else {
      return tasks.filter(t => getTagGroup(t) === group);
    }
  };

  const priorityColors = {
    High: "priority-high",
    Medium: "priority-medium",
    Low: "priority-low",
  };

  const statusColors: Record<string, string> = {
    Pending: "bg-info-soft",
    Ongoing: "bg-purple-soft",
    Blocked: "bg-orange-soft",
    Completed: "bg-success-soft",
    Failed: "bg-destructive-soft",
  };

  const tagColors: Record<string, string> = {
    Reporting: "bg-primary/15",
    Campaigns: "bg-success/15",
    Tech: "bg-info/15",
    Problems: "bg-destructive/15",
    "L&D": "bg-warning/15",
    Research: "bg-accent",
    Untagged: "bg-muted/30",
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
      setOpenDropdown(null);
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
      setOpenDropdown(null);
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
      setOpenDropdown(null);
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
        await supabase
          .from('tasks')
          .update({ status: targetGroup as 'Pending' | 'Ongoing' | 'Blocked' | 'Completed' | 'Failed' })
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
      } else if (groupBy === 'tags') {
        // Find the tag value from the label
        const tagDef = TASK_TAGS.find(t => t.label === targetGroup);
        const newLabels = tagDef ? [tagDef.value] : [];
        
        await supabase
          .from('tasks')
          .update({ labels: newLabels })
          .eq('id', taskId);
        
        toast({
          title: "Tag updated",
          description: `Task moved to ${targetGroup}`,
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getGroupColor = (group: string) => {
    if (groupBy === 'status') return statusColors[group] || 'bg-muted/30';
    if (groupBy === 'tags') return tagColors[group] || 'bg-muted/30';
    return 'bg-muted/30';
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className={cn(
        "grid gap-md",
        groupBy === 'tags' ? "grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7" : "grid-cols-1 md:grid-cols-5"
      )}>
        {groups.map(group => {
          const groupTasks = filterTasksByGroup(group);
          const color = getGroupColor(group);
          const taskIds = groupTasks.map(t => t.id);
          
          return (
            <SortableContext key={group} id={group} items={taskIds} strategy={verticalListSortingStrategy}>
              <div className="flex flex-col min-h-[400px]">
                <div className="flex items-center justify-between py-2 px-1 mb-2">
                  <h3 className="font-semibold text-body-sm text-foreground">{group}</h3>
                  <Badge variant="secondary" className="text-metadata h-5 px-1.5">
                    {groupTasks.length}
                  </Badge>
                </div>
                
                <ScrollArea className="flex-1">
                  <div className="space-y-1">
                    {groupTasks.length === 0 ? (
                      <div className="py-8 text-center text-muted-foreground text-metadata rounded-lg bg-muted/30">
                        No tasks
                      </div>
                    ) : (
                      groupTasks.map(task => (
                        <div key={task.id} className="rounded-lg bg-card border border-border hover:border-primary/30 hover:shadow-sm transition-smooth">
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
