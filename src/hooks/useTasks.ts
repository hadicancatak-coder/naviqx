import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { realtimeService } from "@/lib/realtimeService";
import { mapStatusToUi } from '@/domain';
import { TASK_QUERY_KEY, TASK_WITH_TEMPLATES_KEY } from "@/lib/queryKeys";

export interface TaskFilters {
  assignees?: string[];
  teams?: string[];
  dateFilter?: {
    label: string;
    startDate: Date;
    endDate: Date;
  } | null;
  status?: string;
  search?: string;
  includeTemplates?: boolean; // New option to include templates
}

export function useTasks(filters?: TaskFilters) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const fetchTasks = async () => {
    // Query is enabled only when user exists, but guard anyway
    if (!user) throw new Error('User not authenticated');

    let query = supabase
      .from("tasks")
      .select(`
        *,
        task_assignees(
          user_id,
          profiles!task_assignees_user_id_fkey(id, user_id, name, avatar_url, teams, working_days)
        ),
        task_comment_counts(comment_count)
      `)
      .is('parent_id', null) // Only fetch top-level tasks, not subtasks
      .order("created_at", { ascending: false });

    // Filter out recurrence templates by default - they should not appear in main task list
    // Templates only exist to generate instances, not to be worked on directly
    if (!filters?.includeTemplates) {
      query = query.or('is_recurrence_template.is.null,is_recurrence_template.eq.false');
    }

    const { data, error } = await query;

    if (error) throw error;

    // Map tasks and include comments count, transform DB status → UI status
    interface TaskAssigneeRow {
      user_id: string;
      profiles: Record<string, unknown> | null;
    }
    interface TaskRow {
      id: string;
      status: string;
      task_assignees?: TaskAssigneeRow[];
      task_comment_counts?: Array<{ comment_count: number }>;
      [key: string]: unknown;
    }
    return (data || []).map((task: TaskRow) => ({
      ...task,
      status: mapStatusToUi(task.status),
      assignees: task.task_assignees?.map((ta) => ta.profiles).filter(Boolean) || [],
      comments_count: task.task_comment_counts?.[0]?.comment_count || 0
    }));
  };

  const query = useQuery({
    queryKey: filters?.includeTemplates ? TASK_WITH_TEMPLATES_KEY : TASK_QUERY_KEY,
    queryFn: fetchTasks,
    enabled: !!user, // Only run when user is authenticated
    staleTime: 2 * 60 * 1000, // 2 minutes - significantly reduce refetches
    gcTime: 5 * 60 * 1000, // 5 minutes garbage collection
    refetchOnWindowFocus: false, // Don't refetch on tab focus
    refetchOnReconnect: false, // Don't refetch on reconnect - rely on realtime
    placeholderData: (previousData) => previousData, // Show stale data instantly while refetching
  });

  // Setup realtime subscription using centralized service
  useEffect(() => {
    if (!user) return;

    const unsubscribe = realtimeService.subscribe('tasks', () => {
      queryClient.invalidateQueries({ queryKey: TASK_QUERY_KEY });
    });

    return () => {
      unsubscribe();
    };
  }, [user, queryClient]);

  return query;
}
