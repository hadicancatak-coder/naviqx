/**
 * Task data prefetching utilities for instant navigation
 * Preloads task data into React Query cache before navigation
 */

import { queryClient } from './queryClient';
import { supabase } from '@/integrations/supabase/client';
import { mapStatusToUi } from '@/lib/taskStatusMapper';

// Track if prefetch is in progress to avoid duplicate requests
let prefetchInProgress = false;

/**
 * Prefetch tasks data into React Query cache
 * Call this after auth/MFA completes or on sidebar hover
 */
export async function prefetchTasksData(): Promise<void> {
  // Skip if already prefetching or already has fresh data
  const existingData = queryClient.getQueryData(['tasks', false]);
  const queryState = queryClient.getQueryState(['tasks', false]);
  
  if (prefetchInProgress) return;
  if (existingData && queryState?.dataUpdatedAt && Date.now() - queryState.dataUpdatedAt < 30000) {
    return; // Data is fresh (less than 30s old)
  }
  
  prefetchInProgress = true;
  
  try {
    await queryClient.prefetchQuery({
      queryKey: ['tasks', false],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("tasks")
          .select(`
            id, title, description, status, priority, due_at, created_at, updated_at,
            labels, sprint, project_id, task_type, is_recurrence_template, parent_id,
            pending_approval, blocked_reason, external_dependency_reason, recurrence_rule,
            failure_reason, created_by, updated_by, countries,
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
      staleTime: 30000,
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
  const existingData = queryClient.getQueryData(['tasks', false]);
  return !!existingData;
}
