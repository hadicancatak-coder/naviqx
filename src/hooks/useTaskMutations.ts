import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { mapStatusToDb } from '@/lib/taskStatusMapper';
import { completeTask as completeTaskAction, setTaskStatus } from '@/domain';
import { TASK_QUERY_KEY, TASK_DETAIL_KEY } from '@/lib/queryKeys';

// Task mutation hooks with optimistic updates for instant UI feedback

interface UpdateTaskParams {
  id: string;
  updates: Partial<{
    status: 'Pending' | 'Ongoing' | 'Completed' | 'Failed' | 'Blocked'; // DB values
    priority: 'Low' | 'Medium' | 'High';
    due_at: string | null;
    title: string;
    description: string;
    [key: string]: any;
  }>;
}

export const useTaskMutations = () => {
  const queryClient = useQueryClient();

  // Main update mutation with optimistic updates
  const updateTask = useMutation({
    mutationFn: async ({ id, updates }: UpdateTaskParams) => {
      const { data, error } = await supabase
        .from('tasks')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onMutate: async ({ id, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: TASK_QUERY_KEY });
      
      // Snapshot previous value
      const previousTasks = queryClient.getQueryData(TASK_QUERY_KEY);
      
      // Optimistically update cache
      queryClient.setQueryData(TASK_QUERY_KEY, (old: any) => {
        if (!old) return old;
        return old.map((task: any) =>
          task.id === id ? { ...task, ...updates, updated_at: new Date().toISOString() } : task
        );
      });
      
      return { previousTasks };
    },
    onError: (err: any, variables, context) => {
      // Rollback on error
      if (context?.previousTasks) {
        queryClient.setQueryData(TASK_QUERY_KEY, context.previousTasks);
      }
      toast({
        title: "Update failed",
        description: err.message || "Failed to update task",
        variant: "destructive"
      });
    },
    onSuccess: (data, variables) => {
      // Show success message for non-silent updates
      const updateType = variables.updates.status ? 'Status' : 
                        variables.updates.priority ? 'Priority' : 
                        variables.updates.due_at ? 'Deadline' : 'Task';
      
      toast({ 
        title: `${updateType} updated`,
        duration: 2000
      });
    },
    onSettled: () => {
      // Refetch to ensure sync with server
      queryClient.invalidateQueries({ queryKey: TASK_QUERY_KEY });
    }
  });

  // Helper mutation for completing tasks - uses shared action
  const completeTask = useMutation({
    mutationFn: async (id: string) => {
      const result = await completeTaskAction(id);
      if (!result.success) {
        throw new Error(result.error || 'Failed to complete task');
      }
      return result.data;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: TASK_QUERY_KEY });
      const previousTasks = queryClient.getQueryData(TASK_QUERY_KEY);
      
      queryClient.setQueryData(TASK_QUERY_KEY, (old: any) => {
        if (!old) return old;
        return old.map((task: any) =>
          task.id === id ? { ...task, status: 'Completed', updated_at: new Date().toISOString() } : task
        );
      });
      
      return { previousTasks };
    },
    onError: (err: any, variables, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(TASK_QUERY_KEY, context.previousTasks);
      }
      toast({
        title: "Failed to complete task",
        description: err.message,
        variant: "destructive"
      });
    },
    onSuccess: () => {
      toast({ title: "Task completed", duration: 2000 });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: TASK_QUERY_KEY });
    }
  });

  // Helper mutation for updating deadline
  const updateDeadline = useMutation({
    mutationFn: async ({ id, due_at }: { id: string; due_at: string }) => {
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
      const previousTasks = queryClient.getQueryData(TASK_QUERY_KEY);
      
      queryClient.setQueryData(TASK_QUERY_KEY, (old: any) => {
        if (!old) return old;
        return old.map((task: any) =>
          task.id === id ? { ...task, due_at, updated_at: new Date().toISOString() } : task
        );
      });
      
      return { previousTasks };
    },
    onError: (err: any, variables, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(TASK_QUERY_KEY, context.previousTasks);
      }
      toast({
        title: "Failed to update deadline",
        description: err.message,
        variant: "destructive"
      });
    },
    onSuccess: () => {
      toast({ title: "Deadline updated", duration: 2000 });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: TASK_QUERY_KEY });
    }
  });

  // Helper mutation for updating status
  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const dbStatus = mapStatusToDb(status) as 'Pending' | 'Ongoing' | 'Completed' | 'Failed' | 'Blocked';
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
      const previousTasks = queryClient.getQueryData(TASK_QUERY_KEY);
      
      queryClient.setQueryData(TASK_QUERY_KEY, (old: any) => {
        if (!old) return old;
        return old.map((task: any) =>
          task.id === id ? { ...task, status, updated_at: new Date().toISOString() } : task
        );
      });
      
      return { previousTasks };
    },
    onError: (err: any, variables, context) => {
      console.error('Task status update failed:', {
        error: err,
        variables,
        errorMessage: err.message,
        errorDetails: err.details,
        hint: err.hint
      });
      
      if (context?.previousTasks) {
        queryClient.setQueryData(TASK_QUERY_KEY, context.previousTasks);
      }
      toast({
        title: "Failed to update status",
        description: `${err.message}${err.hint ? ` - ${err.hint}` : ''}`,
        variant: "destructive"
      });
    },
    onSuccess: () => {
      toast({ title: "Status updated", duration: 2000 });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: TASK_QUERY_KEY });
    }
  });

  // Helper mutation for updating priority
  const updatePriority = useMutation({
    mutationFn: async ({ id, priority }: { id: string; priority: any }) => {
      const { data, error } = await supabase
        .from('tasks')
        .update({ priority })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onMutate: async ({ id, priority }) => {
      await queryClient.cancelQueries({ queryKey: TASK_QUERY_KEY });
      const previousTasks = queryClient.getQueryData(TASK_QUERY_KEY);
      
      queryClient.setQueryData(TASK_QUERY_KEY, (old: any) => {
        if (!old) return old;
        return old.map((task: any) =>
          task.id === id ? { ...task, priority, updated_at: new Date().toISOString() } : task
        );
      });
      
      return { previousTasks };
    },
    onError: (err: any, variables, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(TASK_QUERY_KEY, context.previousTasks);
      }
      toast({
        title: "Failed to update priority",
        description: err.message,
        variant: "destructive"
      });
    },
    onSuccess: () => {
      toast({ title: "Priority updated", duration: 2000 });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: TASK_QUERY_KEY });
    }
  });

  // Bulk mutation for setting sprint on multiple tasks
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
      
      queryClient.setQueryData(TASK_QUERY_KEY, (old: any) => {
        if (!old) return old;
        return old.map((task: any) =>
          taskIds.includes(task.id) 
            ? { ...task, sprint: sprintId, updated_at: new Date().toISOString() } 
            : task
        );
      });
      
      return { previousTasks };
    },
    onError: (err: any, variables, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(TASK_QUERY_KEY, context.previousTasks);
      }
      toast({
        title: "Failed to update sprint",
        description: err.message,
        variant: "destructive"
      });
    },
    onSuccess: (data, variables) => {
      const action = variables.sprintId ? 'added to sprint' : 'moved to backlog';
      toast({ 
        title: `${variables.taskIds.length} task${variables.taskIds.length > 1 ? 's' : ''} ${action}`, 
        duration: 2000 
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: TASK_QUERY_KEY });
    }
  });

  // Helper function to call setSprintBulk mutation
  const setSprintBulkFn = (taskIds: string[], sprintId: string | null) => {
    setSprintBulk.mutate({ taskIds, sprintId });
  };

  // Description mutation with optimistic update to both caches (silent - no toast)
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
      
      const previousTasks = queryClient.getQueryData(TASK_QUERY_KEY);
      const previousTask = queryClient.getQueryData(TASK_DETAIL_KEY(id));
      
      // Optimistically update list cache
      queryClient.setQueryData(TASK_QUERY_KEY, (old: any) => {
        if (!old) return old;
        return old.map((task: any) =>
          task.id === id ? { ...task, description, updated_at: new Date().toISOString() } : task
        );
      });
      
      // Optimistically update detail cache
      queryClient.setQueryData(TASK_DETAIL_KEY(id), (old: any) => {
        if (!old) return old;
        return { ...old, description, updated_at: new Date().toISOString() };
      });
      
      return { previousTasks, previousTask };
    },
    onError: (err: any, { id }, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(TASK_QUERY_KEY, context.previousTasks);
      }
      if (context?.previousTask) {
        queryClient.setQueryData(TASK_DETAIL_KEY(id), context.previousTask);
      }
      toast({
        title: "Failed to save description",
        description: err.message,
        variant: "destructive"
      });
    },
    // Silent save - no toast on success
    onSettled: (data, error, { id }) => {
      queryClient.invalidateQueries({ queryKey: TASK_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: TASK_DETAIL_KEY(id) });
    }
  });

  // Title mutation with optimistic update to both caches
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
      
      const previousTasks = queryClient.getQueryData(TASK_QUERY_KEY);
      const previousTask = queryClient.getQueryData(TASK_DETAIL_KEY(id));
      
      queryClient.setQueryData(TASK_QUERY_KEY, (old: any) => {
        if (!old) return old;
        return old.map((task: any) =>
          task.id === id ? { ...task, title, updated_at: new Date().toISOString() } : task
        );
      });
      
      queryClient.setQueryData(TASK_DETAIL_KEY(id), (old: any) => {
        if (!old) return old;
        return { ...old, title, updated_at: new Date().toISOString() };
      });
      
      return { previousTasks, previousTask };
    },
    onError: (err: any, { id }, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(TASK_QUERY_KEY, context.previousTasks);
      }
      if (context?.previousTask) {
        queryClient.setQueryData(TASK_DETAIL_KEY(id), context.previousTask);
      }
      toast({
        title: "Failed to save title",
        description: err.message,
        variant: "destructive"
      });
    },
    onSuccess: () => {
      toast({ title: "Title updated", duration: 2000 });
    },
    onSettled: (data, error, { id }) => {
      queryClient.invalidateQueries({ queryKey: TASK_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: TASK_DETAIL_KEY(id) });
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
    setSprintBulk: setSprintBulkFn,
    isSettingSprintBulk: setSprintBulk.isPending,
  };
};
