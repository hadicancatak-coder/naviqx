import { useMutation, useQueryClient, QueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { mapStatusToDb, completeTask as completeTaskAction } from '@/domain';
import { TASK_QUERY_KEY, TASK_DETAIL_KEY } from '@/lib/queryKeys';
import { RecurrenceRule, calculateFirstOccurrence } from '@/lib/recurrenceUtils';

/**
 * Task mutation hooks with optimistic updates for instant UI feedback.
 * All mutations update both the task list and task detail caches.
 */

interface UpdateTaskParams {
  id: string;
  updates: Partial<{
    status: 'Backlog' | 'Ongoing' | 'Completed' | 'Failed' | 'Blocked';
    priority: 'Low' | 'Medium' | 'High';
    due_at: string | null;
    title: string;
    description: string;
  }> & Record<string, unknown>;
}

// =============================================================================
// Helper: Optimistic update for both list and detail caches
// =============================================================================
interface TaskListItem {
  id: string;
  [key: string]: unknown;
}

function optimisticUpdate(
  queryClient: QueryClient,
  taskId: string,
  updates: Record<string, unknown>
) {
  const previousTasks = queryClient.getQueryData(TASK_QUERY_KEY);
  const previousTask = queryClient.getQueryData(TASK_DETAIL_KEY(taskId));
  
  const patchedData = { ...updates, updated_at: new Date().toISOString() };
  
  // Update list cache
  queryClient.setQueryData(TASK_QUERY_KEY, (old: TaskListItem[] | undefined) => {
    if (!old) return old;
    return old.map((task) =>
      task.id === taskId ? { ...task, ...patchedData } : task
    );
  });
  
  // Update detail cache
  queryClient.setQueryData(TASK_DETAIL_KEY(taskId), (old: Record<string, unknown> | undefined) => {
    if (!old) return old;
    return { ...old, ...patchedData };
  });
  
  return { previousTasks, previousTask };
}

function rollback(
  queryClient: QueryClient,
  taskId: string,
  context: { previousTasks?: unknown; previousTask?: unknown } | undefined
) {
  if (context?.previousTasks) {
    queryClient.setQueryData(TASK_QUERY_KEY, context.previousTasks);
  }
  if (context?.previousTask) {
    queryClient.setQueryData(TASK_DETAIL_KEY(taskId), context.previousTask);
  }
}

function invalidateBothCaches(queryClient: QueryClient, taskId?: string) {
  queryClient.invalidateQueries({ queryKey: TASK_QUERY_KEY });
  if (taskId) {
    queryClient.invalidateQueries({ queryKey: TASK_DETAIL_KEY(taskId) });
  }
}

// =============================================================================
// Main Hook
// =============================================================================
export const useTaskMutations = () => {
  const queryClient = useQueryClient();

  // Generic update mutation
  const updateTask = useMutation({
    mutationFn: async ({ id, updates }: UpdateTaskParams) => {
      const { data, error } = await supabase
        .from('tasks')
        .update(updates as Record<string, unknown>)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: TASK_QUERY_KEY });
      await queryClient.cancelQueries({ queryKey: TASK_DETAIL_KEY(id) });
      return optimisticUpdate(queryClient, id, updates);
    },
    onError: (err: Error, { id }, context) => {
      rollback(queryClient, id, context);
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    },
    onSuccess: (_, { updates }) => {
      const updateType = updates.status ? 'Status' : 
                        updates.priority ? 'Priority' : 
                        updates.due_at !== undefined ? 'Deadline' : 'Task';
      toast({ title: `${updateType} updated`, duration: 2000 });
    },
    onSettled: (_, __, { id }) => invalidateBothCaches(queryClient, id)
  });

  // Complete task
  const completeTask = useMutation({
    mutationFn: async (id: string) => {
      const result = await completeTaskAction(id);
      if (!result.success) throw new Error(result.error || 'Failed to complete task');
      return result.data;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: TASK_QUERY_KEY });
      await queryClient.cancelQueries({ queryKey: TASK_DETAIL_KEY(id) });
      return optimisticUpdate(queryClient, id, { status: 'Completed' });
    },
    onError: (err: Error, id, context) => {
      rollback(queryClient, id, context);
      toast({ title: "Failed to complete task", description: err.message, variant: "destructive" });
    },
    onSuccess: () => toast({ title: "Task completed", duration: 2000 }),
    onSettled: (_, __, id) => invalidateBothCaches(queryClient, id)
  });

  // Update deadline
  const updateDeadline = useMutation({
    mutationFn: async ({ id, due_at }: { id: string; due_at: string | null }) => {
      const { data, error } = await supabase
        .from('tasks')
        .update({ due_at })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onMutate: async ({ id, due_at }) => {
      await queryClient.cancelQueries({ queryKey: TASK_QUERY_KEY });
      await queryClient.cancelQueries({ queryKey: TASK_DETAIL_KEY(id) });
      return optimisticUpdate(queryClient, id, { due_at });
    },
    onError: (err: Error, { id }, context) => {
      rollback(queryClient, id, context);
      toast({ title: "Failed to update deadline", description: err.message, variant: "destructive" });
    },
    onSuccess: () => toast({ title: "Deadline updated", duration: 2000 }),
    onSettled: (_, __, { id }) => invalidateBothCaches(queryClient, id)
  });

  // Update status
  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const dbStatus = mapStatusToDb(status) as 'Backlog' | 'Ongoing' | 'Completed' | 'Failed' | 'Blocked';
      const { data, error } = await supabase
        .from('tasks')
        .update({ status: dbStatus })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: TASK_QUERY_KEY });
      await queryClient.cancelQueries({ queryKey: TASK_DETAIL_KEY(id) });
      return optimisticUpdate(queryClient, id, { status });
    },
    onError: (err: Error, { id }, context) => {
      rollback(queryClient, id, context);
      toast({ title: "Failed to update status", description: err.message, variant: "destructive" });
    },
    onSuccess: () => toast({ title: "Status updated", duration: 2000 }),
    onSettled: (_, __, { id }) => invalidateBothCaches(queryClient, id)
  });

  // Update priority
  const updatePriority = useMutation({
    mutationFn: async ({ id, priority }: { id: string; priority: string }) => {
      const { data, error } = await supabase
        .from('tasks')
        .update({ priority: priority as 'Low' | 'Medium' | 'High' })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onMutate: async ({ id, priority }) => {
      await queryClient.cancelQueries({ queryKey: TASK_QUERY_KEY });
      await queryClient.cancelQueries({ queryKey: TASK_DETAIL_KEY(id) });
      return optimisticUpdate(queryClient, id, { priority });
    },
    onError: (err: Error, { id }, context) => {
      rollback(queryClient, id, context);
      toast({ title: "Failed to update priority", description: err.message, variant: "destructive" });
    },
    onSuccess: () => toast({ title: "Priority updated", duration: 2000 }),
    onSettled: (_, __, { id }) => invalidateBothCaches(queryClient, id)
  });

  // Update description (silent - no success toast)
  const updateDescription = useMutation({
    mutationFn: async ({ id, description }: { id: string; description: string }) => {
      const { data, error } = await supabase
        .from('tasks')
        .update({ description })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onMutate: async ({ id, description }) => {
      await queryClient.cancelQueries({ queryKey: TASK_QUERY_KEY });
      await queryClient.cancelQueries({ queryKey: TASK_DETAIL_KEY(id) });
      return optimisticUpdate(queryClient, id, { description });
    },
    onError: (err: Error, { id }, context) => {
      rollback(queryClient, id, context);
      toast({ title: "Failed to save description", description: err.message, variant: "destructive" });
    },
    onSettled: (_, __, { id }) => invalidateBothCaches(queryClient, id)
  });

  // Update title
  const updateTitle = useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const { data, error } = await supabase
        .from('tasks')
        .update({ title })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onMutate: async ({ id, title }) => {
      await queryClient.cancelQueries({ queryKey: TASK_QUERY_KEY });
      await queryClient.cancelQueries({ queryKey: TASK_DETAIL_KEY(id) });
      return optimisticUpdate(queryClient, id, { title });
    },
    onError: (err: Error, { id }, context) => {
      rollback(queryClient, id, context);
      toast({ title: "Failed to save title", description: err.message, variant: "destructive" });
    },
    onSuccess: () => toast({ title: "Title updated", duration: 2000 }),
    onSettled: (_, __, { id }) => invalidateBothCaches(queryClient, id)
  });

  // Bulk sprint update
  const setSprintBulk = useMutation({
    mutationFn: async ({ taskIds, sprintId }: { taskIds: string[]; sprintId: string | null }) => {
      const { data, error } = await supabase
        .from('tasks')
        .update({ sprint: sprintId })
        .in('id', taskIds)
        .select();
      if (error) throw error;
      return data;
    },
    onMutate: async ({ taskIds, sprintId }) => {
      await queryClient.cancelQueries({ queryKey: TASK_QUERY_KEY });
      const previousTasks = queryClient.getQueryData(TASK_QUERY_KEY);
      
      queryClient.setQueryData(TASK_QUERY_KEY, (old: TaskListItem[] | undefined) => {
        if (!old) return old;
        return old.map((task) =>
          taskIds.includes(task.id) 
            ? { ...task, sprint: sprintId, updated_at: new Date().toISOString() } 
            : task
        );
      });
      
      return { previousTasks };
    },
    onError: (err: Error, _, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(TASK_QUERY_KEY, context.previousTasks);
      }
      toast({ title: "Failed to update sprint", description: err.message, variant: "destructive" });
    },
    onSuccess: (_, { taskIds, sprintId }) => {
      const action = sprintId ? 'added to sprint' : 'moved to backlog';
      toast({ title: `${taskIds.length} task${taskIds.length > 1 ? 's' : ''} ${action}`, duration: 2000 });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: TASK_QUERY_KEY })
  });

  // Update recurrence rule for recurring task templates
  const updateRecurrence = useMutation({
    mutationFn: async ({ id, rule }: { id: string; rule: RecurrenceRule }) => {
      const nextRun = calculateFirstOccurrence(rule);
      const { data, error } = await supabase
        .from('tasks')
        .update({
          recurrence_rrule: JSON.stringify(rule),
          recurrence_end_type: rule.end_condition,
          recurrence_end_value: rule.end_value?.toString() || null,
          next_run_at: nextRun?.toISOString() || null,
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onMutate: async ({ id, rule }) => {
      await queryClient.cancelQueries({ queryKey: TASK_QUERY_KEY });
      await queryClient.cancelQueries({ queryKey: TASK_DETAIL_KEY(id) });
      const nextRun = calculateFirstOccurrence(rule);
      return optimisticUpdate(queryClient, id, {
        recurrence_rrule: JSON.stringify(rule),
        recurrence_end_type: rule.end_condition,
        recurrence_end_value: rule.end_value?.toString() || null,
        next_run_at: nextRun?.toISOString() || null,
      });
    },
    onError: (err: Error, { id }, context) => {
      rollback(queryClient, id, context);
      toast({ title: "Failed to update recurrence", description: err.message, variant: "destructive" });
    },
    onSuccess: () => toast({ title: "Recurrence updated", duration: 2000 }),
    onSettled: (_, __, { id }) => {
      invalidateBothCaches(queryClient, id);
      // Also invalidate the template-task cache so instances see updated recurrence
      queryClient.invalidateQueries({ queryKey: ['template-task', id] });
    }
  });

  return { 
    updateTask, 
    completeTask, 
    updateDeadline, 
    updateStatus, 
    updatePriority,
    updateDescription,
    updateTitle,
    updateRecurrence,
    setSprintBulk: (taskIds: string[], sprintId: string | null) => setSprintBulk.mutate({ taskIds, sprintId }),
    isSettingSprintBulk: setSprintBulk.isPending,
  };
};
