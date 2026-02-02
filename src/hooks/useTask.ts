import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TASK_QUERY_KEY, TASK_DETAIL_KEY } from '@/lib/queryKeys';
import { mapStatusToUi } from '@/domain';

export interface TaskAssignee {
  id: string;
  user_id: string;
  name: string;
  username?: string;
  avatar_url?: string;
  working_days?: string | null;
}

export interface TaskWithAssignees {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: 'Low' | 'Medium' | 'High';
  due_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
  project_id: string | null;
  phase_id: string | null;
  sprint: string | null;
  labels: string[] | null;
  parent_id: string | null;
  is_collaborative?: boolean;
  is_recurring?: boolean;
  is_recurrence_template?: boolean;
  template_task_id?: string | null;
  recurrence_rrule?: string | null;
  blocker_reason?: string | null;
  failure_reason?: string | null;
  assignees: TaskAssignee[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- DB extensibility requires index signature
  [key: string]: any;
}

/**
 * React Query hook for fetching a single task by ID.
 * Uses placeholderData from the task list cache for instant display.
 * Includes assignees with working_days for deadline validation.
 */
export function useTask(taskId: string, cachedTask?: TaskWithAssignees) {
  const queryClient = useQueryClient();
  
  // Subscribe to realtime updates for this specific task
  useEffect(() => {
    if (!taskId || taskId === '' || taskId === 'undefined') return;
    
    const channel = supabase
      .channel(`task-detail-${taskId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tasks',
          filter: `id=eq.${taskId}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: TASK_DETAIL_KEY(taskId) });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [taskId, queryClient]);
  
  return useQuery({
    queryKey: TASK_DETAIL_KEY(taskId),
    queryFn: async (): Promise<TaskWithAssignees> => {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          task_assignees(
            user_id,
            completed_at,
            profiles!task_assignees_user_id_fkey(
              id, user_id, name, username, avatar_url, working_days
            )
          )
        `)
        .eq('id', taskId)
        .single();
      
      if (error) throw error;
      
      // Transform assignees from nested structure
      interface TaskAssigneeJoin {
        user_id: string;
        completed_at: string | null;
        profiles: TaskAssignee | null;
      }
      const assignees = data.task_assignees
        ?.map((ta: TaskAssigneeJoin) => ta.profiles)
        .filter(Boolean) || [];
      
      return {
        ...data,
        status: mapStatusToUi(data.status),
        assignees,
      };
    },
    enabled: !!taskId && taskId !== '' && taskId !== 'undefined',
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    placeholderData: () => {
      // Use provided cached task first
      if (cachedTask) {
        return {
          ...cachedTask,
          status: mapStatusToUi(cachedTask.status),
          assignees: cachedTask.assignees || [],
        };
      }
      // Try to find in list cache
      const listData = queryClient.getQueryData(TASK_QUERY_KEY) as TaskWithAssignees[] | undefined;
      const found = listData?.find(t => t.id === taskId);
      if (found) {
        return {
          ...found,
          status: mapStatusToUi(found.status),
          assignees: found.assignees || [],
        };
      }
      return undefined;
    },
  });
}
