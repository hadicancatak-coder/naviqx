/**
 * Task data prefetching utilities for instant navigation
 * Preloads task data into React Query cache before navigation
 */

import { queryClient } from './queryClient';
import { supabase } from '@/integrations/supabase/client';
import { mapStatusToUi } from '@/lib/taskStatusMapper';
import { TASK_QUERY_KEY } from '@/lib/queryKeys';

// Track if prefetch is in progress to avoid duplicate requests
let prefetchInProgress = false;

/**
 * Prefetch tasks data into React Query cache
 * Call this after auth/MFA completes or on sidebar hover
 */
export async function prefetchTasksData(): Promise<void> {
  // Skip if already prefetching or already has fresh data
  const existingData = queryClient.getQueryData(TASK_QUERY_KEY);
  const queryState = queryClient.getQueryState(TASK_QUERY_KEY);
  
  if (prefetchInProgress) return;
  if (existingData && queryState?.dataUpdatedAt && Date.now() - queryState.dataUpdatedAt < 2 * 60 * 1000) {
    return; // Data is fresh (less than 2 min old)
  }
  
  prefetchInProgress = true;
  
  try {
    await queryClient.prefetchQuery({
      queryKey: TASK_QUERY_KEY,
      queryFn: async () => {
        const { data, error } = await supabase
          .from("tasks")
          .select(`
            id, title, description, status, priority, due_at, created_at, updated_at,
            labels, sprint, project_id, task_type, is_recurrence_template, parent_id,
            pending_approval, blocker_reason, external_dependency_reason, recurrence_rrule,
            failure_reason, created_by, updated_by, entity,
            task_assignees(
              user_id,
              profiles!task_assignees_user_id_fkey(id, user_id, name, avatar_url, teams, working_days)
            ),
            task_comment_counts(comment_count)
          `)
          .is('parent_id', null)
          .or('is_recurrence_template.is.null,is_recurrence_template.eq.false')
          .order("created_at", { ascending: false });

        if (error) throw error;

        return (data || []).map((task: any) => ({
          ...task,
          status: mapStatusToUi(task.status),
          assignees: task.task_assignees?.map((ta: any) => ta.profiles).filter(Boolean) || [],
          comments_count: task.task_comment_counts?.[0]?.comment_count || 0
        }));
      },
      staleTime: 2 * 60 * 1000, // 2 minutes - match useTasks
    });
  } catch (err) {
    console.error('Task prefetch failed:', err);
  } finally {
    prefetchInProgress = false;
  }
}

/**
 * Check if tasks data is already cached and fresh
 */
export function hasTasksDataCached(): boolean {
  const existingData = queryClient.getQueryData(TASK_QUERY_KEY);
  return !!existingData;
}
