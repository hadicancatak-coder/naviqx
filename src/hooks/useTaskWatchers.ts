import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Watcher {
  id: string;
  user_id: string;
  profile?: {
    name: string;
    avatar_url?: string;
  };
}

export function useTaskWatchers(taskId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: watchers, isLoading } = useQuery({
    queryKey: ['task-watchers', taskId],
    queryFn: async () => {
      // First get the watchers
      const { data: watcherData, error } = await supabase
        .from('task_watchers')
        .select('id, user_id')
        .eq('task_id', taskId);

      if (error) throw error;
      
      if (!watcherData || watcherData.length === 0) return [];

      // Then fetch profiles for those users
      const userIds = watcherData.map(w => w.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, avatar_url')
        .in('id', userIds);

      // Map watchers with their profiles
      return watcherData.map(watcher => ({
        id: watcher.id,
        user_id: watcher.user_id,
        profile: profiles?.find(p => p.id === watcher.user_id) || undefined,
      })) as Watcher[];
    },
    enabled: !!taskId,
  });

  const isWatching = (watchers || []).some(w => w.user_id === user?.id);

  const watchTask = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('task_watchers')
        .insert({
          task_id: taskId,
          user_id: user.id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-watchers', taskId] });
    },
  });

  const unwatchTask = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('task_watchers')
        .delete()
        .eq('task_id', taskId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-watchers', taskId] });
    },
  });

  const toggleWatch = () => {
    if (isWatching) {
      unwatchTask.mutate();
    } else {
      watchTask.mutate();
    }
  };

  return {
    watchers: watchers || [],
    isLoading,
    isWatching,
    watchTask,
    unwatchTask,
    toggleWatch,
    isUpdating: watchTask.isPending || unwatchTask.isPending,
  };
}