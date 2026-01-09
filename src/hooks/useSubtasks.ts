import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export interface Subtask {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_at: string | null;
  parent_id: string;
  created_at: string;
  created_by: string;
  assignees?: any[];
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
    staleTime: 30 * 1000, // 30 seconds cache
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subtasks', parentId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to create subtask", 
        description: error.message, 
        variant: "destructive" 
      });
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
    onError: (error: any) => {
      toast({ 
        title: "Failed to update subtask", 
        description: error.message, 
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subtasks', parentId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to update subtask", 
        description: error.message, 
        variant: "destructive" 
      });
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
    onError: (error: any) => {
      toast({ 
        title: "Failed to delete subtask", 
        description: error.message, 
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
    onError: (error: any) => {
      toast({ 
        title: "Failed to complete subtasks", 
        description: error.message, 
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
