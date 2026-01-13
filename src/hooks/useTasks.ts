import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { realtimeService } from "@/lib/realtimeService";
import { mapStatusToUi } from "@/lib/taskStatusMapper";

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
    if (!user) return [];

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
    return (data || []).map((task: any) => ({
      ...task,
      status: mapStatusToUi(task.status),
      assignees: task.task_assignees?.map((ta: any) => ta.profiles).filter(Boolean) || [],
      comments_count: task.task_comment_counts?.[0]?.comment_count || 0
    }));
  };

  const query = useQuery({
    queryKey: ['tasks', filters?.includeTemplates],
    queryFn: fetchTasks,
    staleTime: 30000, // 30 seconds - reduce refetches
    refetchOnWindowFocus: false, // Don't refetch on tab focus
  });

  // Setup realtime subscription using centralized service
  useEffect(() => {
    if (!user) return;

    const unsubscribe = realtimeService.subscribe('tasks', () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    });

    return () => {
      unsubscribe();
    };
  }, [user, queryClient]);

  return query;
}
