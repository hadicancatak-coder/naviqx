import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { realtimeService } from "@/lib/realtimeService";
import { mapStatusToUi } from '@/domain';
import { TASK_QUERY_KEY, TASK_WITH_TEMPLATES_KEY } from "@/lib/queryKeys";
import { logger } from "@/lib/logger";

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
    // Type assertion at data boundary - Supabase returns full task rows
    return (data || []).map((task) => ({
      ...task,
      status: mapStatusToUi(task.status),
      assignees: (task.task_assignees ?? []).map((ta) => ta.profiles).filter(Boolean),
      comments_count: task.task_comment_counts?.[0]?.comment_count || 0
    }));
  };

  const query = useQuery({
    queryKey: filters?.includeTemplates ? TASK_WITH_TEMPLATES_KEY : TASK_QUERY_KEY,
    queryFn: fetchTasks,
    enabled: !!user, // Only run when user is authenticated
    staleTime: 30 * 1000, // 30 seconds - balance between freshness and performance
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

  // "Ensure Today" check: if any templates are overdue, call the edge function once per calendar day.
  // Uses sessionStorage with a date-stamped key so it survives remounts/route changes
  // but resets on a new day or new browser session.
  useEffect(() => {
    if (!user) return;

    const todayKey = `ensureToday_${new Date().toISOString().split('T')[0]}`;
    if (sessionStorage.getItem(todayKey)) return;
    // Set flag in-progress to prevent concurrent calls from other remounts
    // but only persist on success so failures retry next mount
    sessionStorage.setItem(todayKey, 'pending');

    const checkOverdueTemplates = async () => {
      try {
        const { data: overdue } = await supabase
          .from('tasks')
          .select('id')
          .eq('is_recurrence_template', true)
          .not('next_run_at', 'is', null)
          .lt('next_run_at', new Date().toISOString())
          .limit(1);

        if (overdue && overdue.length > 0) {
          logger.debug('[useTasks] Overdue templates found, triggering catch-up');
          await supabase.functions.invoke('generate-recurring-tasks');
          queryClient.invalidateQueries({ queryKey: TASK_QUERY_KEY });
        }
        // Only mark as done after success
        sessionStorage.setItem(todayKey, '1');
      } catch (err) {
        // Remove pending flag so next mount retries
        sessionStorage.removeItem(todayKey);
        logger.warn('[useTasks] Ensure-today check failed:', err);
      }
    };

    checkOverdueTemplates();
  }, [user, queryClient]);

  return query;
}
