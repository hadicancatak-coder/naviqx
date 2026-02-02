import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface SubtaskAssignee {
  id: string;
  user_id: string;
  profiles?: {
    id: string;
    user_id: string;
    name: string;
    avatar_url: string | null;
  } | null;
}

export interface Subtask {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_at: string | null;
  parent_id: string;
  created_at: string;
  created_by: string;
  assignees?: SubtaskAssignee[];
}

export function useSubtasks(parentId: string | null) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: subtasks = [], isLoading, refetch } = useQuery({
    queryKey: ['subtasks', parentId],
    queryFn: async () => {
      if (!parentId) return [];
      
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          id,
          title,
          status,
          priority,
          due_at,
          parent_id,
          created_at,
          created_by,
          task_assignees (
            id,
            user_id,
            profiles:user_id (
              id,
              user_id,
              name,
              avatar_url
            )
          )
        `)
        .eq('parent_id', parentId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      // Transform to match expected format
      return (data || []).map(task => ({
        ...task,
        assignees: task.task_assignees?.map((ta: any) => ta.profiles).filter(Boolean) || []
      }));
    },
    enabled: !!parentId,
    staleTime: 2 * 60 * 1000, // 2 minutes cache
    gcTime: 5 * 60 * 1000,
    placeholderData: (previousData) => previousData,
  });

  const createSubtask = useMutation({
    mutationFn: async ({ title, parentId: pId }: { title: string; parentId: string }) => {
      if (!user) throw new Error("Must be logged in");
      
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          title,
          parent_id: pId,
          status: 'Pending' as const,
          priority: 'Medium' as const,
          created_by: user.id,
        } as any)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onMutate: async ({ title, parentId: pId }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['subtasks', pId] });
      
      // Snapshot previous value
      const previousSubtasks = queryClient.getQueryData(['subtasks', pId]);
      
      // Optimistic subtask
      const tempId = `temp-${Date.now()}`;
      const optimisticSubtask = {
        id: tempId,
        title,
        status: 'Pending',
        priority: 'Medium',
        due_at: null,
        parent_id: pId,
        created_at: new Date().toISOString(),
        created_by: user?.id,
        assignees: [],
      };
      
      // Add to cache instantly
      queryClient.setQueryData(['subtasks', pId], (old: any[] | undefined) => {
        if (!old) return [optimisticSubtask];
        return [...old, optimisticSubtask];
      });
      
      return { previousSubtasks, tempId };
    },
    onSuccess: (data, variables, context) => {
      // Replace temp subtask with real one
      queryClient.setQueryData(['subtasks', variables.parentId], (old: any[] | undefined) => {
        if (!old) return old;
        return old.map(s => s.id === context?.tempId ? { ...s, ...data } : s);
      });
    },
    onError: (error: unknown, variables, context) => {
      // Rollback on error
      if (context?.previousSubtasks) {
        queryClient.setQueryData(['subtasks', variables.parentId], context.previousSubtasks);
      }
      toast({ 
        title: "Failed to create subtask", 
        description: error instanceof Error ? error.message : "An error occurred", 
        variant: "destructive" 
      });
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({ queryKey: ['subtasks', variables.parentId] });
    },
  });

  const updateSubtask = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Subtask> }) => {
      const { error } = await supabase
        .from('tasks')
        .update(updates as any)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subtasks', parentId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (error: unknown) => {
      toast({ 
        title: "Failed to update subtask", 
        description: error instanceof Error ? error.message : "An error occurred", 
        variant: "destructive" 
      });
    },
  });

  const completeSubtask = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const { error } = await supabase
        .from('tasks')
        .update({ status: completed ? 'Completed' : 'Pending' } as any)
        .eq('id', id);
      
      if (error) throw error;
    },
    onMutate: async ({ id, completed }) => {
      await queryClient.cancelQueries({ queryKey: ['subtasks', parentId] });
      
      const previousSubtasks = queryClient.getQueryData(['subtasks', parentId]);
      
      // Optimistic update
      queryClient.setQueryData(['subtasks', parentId], (old: any[] | undefined) => {
        if (!old) return old;
        return old.map(s => s.id === id ? { ...s, status: completed ? 'Completed' : 'Pending' } : s);
      });
      
      return { previousSubtasks };
    },
    onError: (error: unknown, _, context) => {
      if (context?.previousSubtasks) {
        queryClient.setQueryData(['subtasks', parentId], context.previousSubtasks);
      }
      toast({ 
        title: "Failed to update subtask", 
        description: error instanceof Error ? error.message : "An error occurred", 
        variant: "destructive" 
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['subtasks', parentId] });
    },
  });

  const deleteSubtask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subtasks', parentId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast({ title: "Subtask deleted" });
    },
    onError: (error: unknown) => {
      toast({ 
        title: "Failed to delete subtask", 
        description: error instanceof Error ? error.message : "An error occurred", 
        variant: "destructive" 
      });
    },
  });

  const completeAllSubtasks = useMutation({
    mutationFn: async () => {
      if (!parentId) return;
      
      const { error } = await supabase
        .from('tasks')
        .update({ status: 'Completed' } as any)
        .eq('parent_id', parentId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subtasks', parentId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast({ title: "All subtasks completed" });
    },
    onError: (error: unknown) => {
      toast({ 
        title: "Failed to complete subtasks", 
        description: error instanceof Error ? error.message : "An error occurred", 
        variant: "destructive" 
      });
    },
  });

  const progress = subtasks.length > 0
    ? Math.round((subtasks.filter((s: Subtask) => s.status === 'Completed').length / subtasks.length) * 100)
    : 0;

  return {
    subtasks: subtasks as Subtask[],
    isLoading,
    refetch,
    createSubtask,
    updateSubtask,
    completeSubtask,
    deleteSubtask,
    completeAllSubtasks,
    progress,
    completedCount: subtasks.filter((s: Subtask) => s.status === 'Completed').length,
    totalCount: subtasks.length,
  };
}
