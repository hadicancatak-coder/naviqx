/**
 * Task Actions - Single Source of Truth
 * All task completion, status changes, and bulk operations MUST use these functions.
 * This prevents inconsistent behavior across different UI components.
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { 
  TaskStatusDBType, 
  STATUS_UI_TO_DB, 
  mapStatusToDb as mapStatusToDbFromConstants 
} from './constants';

/**
 * Maps any UI or DB status to a valid DB status value.
 * Logs warning if invalid status is passed.
 */
const mapStatusToDbLocal = (status: string): TaskStatusDBType => {
  const dbStatus = STATUS_UI_TO_DB[status as keyof typeof STATUS_UI_TO_DB] || 
                   (status === 'Pending' ? 'Pending' : mapStatusToDbFromConstants(status));
  if (!dbStatus) {
    logger.error(`[Task Actions] Invalid status: "${status}". Valid values: ${Object.keys(STATUS_UI_TO_DB).join(', ')}`);
    // Default to Pending rather than throwing to prevent complete failure
    return 'Pending';
  }
  return dbStatus;
};

// =============================================================================
// TYPES
// =============================================================================

export interface TaskActionResult {
  success: boolean;
  error?: string;
  data?: unknown;
}

export interface SetStatusOptions {
  failure_reason?: string;
  blocked_reason?: string;
}

// =============================================================================
// CORE ACTIONS
// =============================================================================

/**
 * Complete a single task
 * Sets status to 'Completed' in the database
 * Templates cannot be completed - only their generated instances can
 * For collaborative tasks: marks current user's completion, only completes task when all assignees done
 */
export async function completeTask(taskId: string, userId?: string): Promise<TaskActionResult> {
  logger.debug('[Task Actions] completeTask called with:', { taskId, userId });
  
  try {
    // Fetch task with assignee info
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('is_recurrence_template, template_task_id, is_collaborative')
      .eq('id', taskId)
      .single();

    if (taskError) {
      logger.error('[Task Actions] Error fetching task:', taskError);
      return { success: false, error: taskError.message };
    }

    if (task?.is_recurrence_template) {
      logger.warn('[Task Actions] Attempted to complete a recurrence template.');
      return { 
        success: false, 
        error: 'Recurrence templates cannot be completed. Complete the generated task instances instead.' 
      };
    }

    // Handle collaborative tasks
    if (task?.is_collaborative && userId) {
      // Get current user's profile ID
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (!profile) {
        return { success: false, error: 'User profile not found' };
      }

      // Mark this user's completion
      const { error: assigneeError } = await supabase
        .from('task_assignees')
        .update({ completed_at: new Date().toISOString() })
        .eq('task_id', taskId)
        .eq('user_id', profile.id);

      if (assigneeError) {
        logger.error('[Task Actions] Error marking assignee completion:', assigneeError);
        return { success: false, error: assigneeError.message };
      }

      // Check if all assignees have completed
      const { data: assignees } = await supabase
        .from('task_assignees')
        .select('id, completed_at')
        .eq('task_id', taskId);

      const allCompleted = assignees?.every(a => a.completed_at !== null);

      if (!allCompleted) {
        const completedCount = assignees?.filter(a => a.completed_at).length || 0;
        const totalCount = assignees?.length || 0;
        return { 
          success: true, 
          data: { 
            partialComplete: true, 
            completedCount, 
            totalCount,
            message: `Marked as complete (${completedCount}/${totalCount} assignees done)` 
          } 
        };
      }
      // All assignees completed, continue to mark task as completed
    }

    const { data, error } = await supabase
      .from('tasks')
      .update({ status: 'Completed' as TaskStatusDBType, updated_at: new Date().toISOString() })
      .eq('id', taskId)
      .select()
      .single();

    if (error) {
      logger.error('[Task Actions] completeTask error:', error);
      return { success: false, error: error.message };
    }

    logger.debug('[Task Actions] completeTask success:', data);
    return { success: true, data };
  } catch (err: unknown) {
    logger.error('[Task Actions] completeTask exception:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Failed to complete task' };
  }
}

/**
 * Toggle collaborative mode for a task
 */
export async function setTaskCollaborative(taskId: string, isCollaborative: boolean): Promise<TaskActionResult> {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .update({ is_collaborative: isCollaborative, updated_at: new Date().toISOString() })
      .eq('id', taskId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // If turning off collaborative mode, clear all individual completions
    if (!isCollaborative) {
      await supabase
        .from('task_assignees')
        .update({ completed_at: null })
        .eq('task_id', taskId);
    }

    return { success: true, data };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to update collaborative mode' };
  }
}

/**
 * Get completion status for collaborative task
 */
export async function getCollaborativeStatus(taskId: string): Promise<{
  isCollaborative: boolean;
  assignees: Array<{ id: string; name: string; completed: boolean; completedAt: string | null }>;
  allCompleted: boolean;
}> {
  const { data: task } = await supabase
    .from('tasks')
    .select('is_collaborative')
    .eq('id', taskId)
    .single();

  const { data: assignees } = await supabase
    .from('task_assignees')
    .select(`
      id,
      user_id,
      completed_at,
      profiles!task_assignees_user_id_fkey (name)
    `)
    .eq('task_id', taskId);

  const mappedAssignees = (assignees || []).map((a) => ({
    id: a.user_id,
    name: (a.profiles as { name: string } | null)?.name || 'Unknown',
    completed: a.completed_at !== null,
    completedAt: a.completed_at,
  }));

  return {
    isCollaborative: task?.is_collaborative || false,
    assignees: mappedAssignees,
    allCompleted: mappedAssignees.every(a => a.completed),
  };
}

/**
 * Complete multiple tasks in bulk
 * Uses Promise.allSettled to handle partial failures gracefully
 */
export async function completeTasksBulk(taskIds: string[]): Promise<{
  success: boolean;
  successCount: number;
  failedCount: number;
  errors: string[];
}> {
  if (taskIds.length === 0) {
    return { success: true, successCount: 0, failedCount: 0, errors: [] };
  }

  const results = await Promise.allSettled(
    taskIds.map(id => completeTask(id))
  );

  const errors: string[] = [];
  let successCount = 0;
  let failedCount = 0;

  results.forEach((result, index) => {
    if (result.status === 'fulfilled' && result.value.success) {
      successCount++;
    } else {
      failedCount++;
      const errorMsg = result.status === 'rejected' 
        ? result.reason?.message 
        : (result.value as TaskActionResult).error;
      errors.push(`Task ${taskIds[index]}: ${errorMsg || 'Unknown error'}`);
    }
  });

  return {
    success: failedCount === 0,
    successCount,
    failedCount,
    errors,
  };
}

/**
 * Set task status with optional reason (for Blocked/Failed statuses)
 */
export async function setTaskStatus(
  taskId: string,
  status: string,
  options?: SetStatusOptions
): Promise<TaskActionResult> {
  try {
    const dbStatus = mapStatusToDbLocal(status);
    
    // Build update object
    const updateData: Record<string, string | null> = {
      status: dbStatus,
      updated_at: new Date().toISOString(),
    };

    // Add reason fields if provided
    if (dbStatus === 'Failed' && options?.failure_reason) {
      updateData.failure_reason = options.failure_reason;
    }
    if (dbStatus === 'Blocked' && options?.blocked_reason) {
      updateData.blocker_reason = options.blocked_reason;
    }

    const { data, error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', taskId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to update task status' };
  }
}

/**
 * Set status for multiple tasks in bulk
 */
export async function setTasksStatusBulk(
  taskIds: string[],
  status: string,
  options?: SetStatusOptions
): Promise<{
  success: boolean;
  successCount: number;
  failedCount: number;
  errors: string[];
}> {
  if (taskIds.length === 0) {
    return { success: true, successCount: 0, failedCount: 0, errors: [] };
  }

  const results = await Promise.allSettled(
    taskIds.map(id => setTaskStatus(id, status, options))
  );

  const errors: string[] = [];
  let successCount = 0;
  let failedCount = 0;

  results.forEach((result, index) => {
    if (result.status === 'fulfilled' && result.value.success) {
      successCount++;
    } else {
      failedCount++;
      const errorMsg = result.status === 'rejected'
        ? result.reason?.message
        : (result.value as TaskActionResult).error;
      errors.push(`Task ${taskIds[index]}: ${errorMsg || 'Unknown error'}`);
    }
  });

  return {
    success: failedCount === 0,
    successCount,
    failedCount,
    errors,
  };
}

/**
 * Delete multiple tasks in bulk
 */
export async function deleteTasksBulk(taskIds: string[]): Promise<{
  success: boolean;
  successCount: number;
  failedCount: number;
  errors: string[];
}> {
  if (taskIds.length === 0) {
    return { success: true, successCount: 0, failedCount: 0, errors: [] };
  }

  const results = await Promise.allSettled(
    taskIds.map(async (id) => {
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) throw error;
      return { success: true };
    })
  );

  const errors: string[] = [];
  let successCount = 0;
  let failedCount = 0;

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      successCount++;
    } else {
      failedCount++;
      errors.push(`Task ${taskIds[index]}: ${result.reason?.message || 'Unknown error'}`);
    }
  });

  return {
    success: failedCount === 0,
    successCount,
    failedCount,
    errors,
  };
}

/**
 * Update priority for multiple tasks in bulk
 */
export async function setPriorityBulk(
  taskIds: string[],
  priority: 'Low' | 'Medium' | 'High'
): Promise<{
  success: boolean;
  successCount: number;
  failedCount: number;
  errors: string[];
}> {
  if (taskIds.length === 0) {
    return { success: true, successCount: 0, failedCount: 0, errors: [] };
  }

  const results = await Promise.allSettled(
    taskIds.map(async (id) => {
      const { error } = await supabase
        .from('tasks')
        .update({ priority, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      return { success: true };
    })
  );

  const errors: string[] = [];
  let successCount = 0;
  let failedCount = 0;

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      successCount++;
    } else {
      failedCount++;
      errors.push(`Task ${taskIds[index]}: ${result.reason?.message || 'Unknown error'}`);
    }
  });

  return {
    success: failedCount === 0,
    successCount,
    failedCount,
    errors,
  };
}

/**
 * Add a comment to a task (used for blocked reasons, etc.)
 */
export async function addTaskComment(
  taskId: string,
  authorId: string,
  body: string
): Promise<TaskActionResult> {
  try {
    const { data, error } = await supabase
      .from('comments')
      .insert({ task_id: taskId, author_id: authorId, body })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to add comment' };
  }
}

// =============================================================================
// ADVANCED BULK ACTIONS (for Advanced Task Board)
// =============================================================================

interface BulkResult {
  success: boolean;
  successCount: number;
  failedCount: number;
  errors: string[];
}

/**
 * Update labels/tags for multiple tasks in bulk
 */
export async function setLabelsBulk(
  taskIds: string[],
  labels: string[]
): Promise<BulkResult> {
  if (taskIds.length === 0) {
    return { success: true, successCount: 0, failedCount: 0, errors: [] };
  }

  const results = await Promise.allSettled(
    taskIds.map(async (id) => {
      const { error } = await supabase
        .from('tasks')
        .update({ labels, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      return { success: true };
    })
  );

  return processBulkResults(results, taskIds);
}

/**
 * Add tags to existing labels for multiple tasks
 */
export async function addLabelsBulk(
  taskIds: string[],
  labelsToAdd: string[]
): Promise<BulkResult> {
  if (taskIds.length === 0 || labelsToAdd.length === 0) {
    return { success: true, successCount: 0, failedCount: 0, errors: [] };
  }

  // First fetch current labels for all tasks
  const { data: tasks, error: fetchError } = await supabase
    .from('tasks')
    .select('id, labels')
    .in('id', taskIds);

  if (fetchError) {
    return { success: false, successCount: 0, failedCount: taskIds.length, errors: [fetchError.message] };
  }

  const results = await Promise.allSettled(
    (tasks || []).map(async (task) => {
      const currentLabels: string[] = (task.labels as string[]) || [];
      const newLabels = [...new Set([...currentLabels, ...labelsToAdd])];
      const { error } = await supabase
        .from('tasks')
        .update({ labels: newLabels, updated_at: new Date().toISOString() })
        .eq('id', task.id);
      if (error) throw error;
      return { success: true };
    })
  );

  return processBulkResults(results, taskIds);
}

/**
 * Remove tags from labels for multiple tasks
 */
export async function removeLabelsBulk(
  taskIds: string[],
  labelsToRemove: string[]
): Promise<BulkResult> {
  if (taskIds.length === 0 || labelsToRemove.length === 0) {
    return { success: true, successCount: 0, failedCount: 0, errors: [] };
  }

  // First fetch current labels for all tasks
  const { data: tasks, error: fetchError } = await supabase
    .from('tasks')
    .select('id, labels')
    .in('id', taskIds);

  if (fetchError) {
    return { success: false, successCount: 0, failedCount: taskIds.length, errors: [fetchError.message] };
  }

  const results = await Promise.allSettled(
    (tasks || []).map(async (task) => {
      const currentLabels: string[] = (task.labels as string[]) || [];
      const newLabels = currentLabels.filter(l => !labelsToRemove.includes(l));
      const { error } = await supabase
        .from('tasks')
        .update({ labels: newLabels, updated_at: new Date().toISOString() })
        .eq('id', task.id);
      if (error) throw error;
      return { success: true };
    })
  );

  return processBulkResults(results, taskIds);
}

/**
 * Set due date for multiple tasks in bulk
 */
export async function setDueDateBulk(
  taskIds: string[],
  dueDate: string | null
): Promise<BulkResult> {
  if (taskIds.length === 0) {
    return { success: true, successCount: 0, failedCount: 0, errors: [] };
  }

  const results = await Promise.allSettled(
    taskIds.map(async (id) => {
      const { error } = await supabase
        .from('tasks')
        .update({ due_at: dueDate, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      return { success: true };
    })
  );

  return processBulkResults(results, taskIds);
}

/**
 * Set sprint for multiple tasks in bulk
 */
export async function setSprintBulk(
  taskIds: string[],
  sprint: string | null
): Promise<BulkResult> {
  if (taskIds.length === 0) {
    return { success: true, successCount: 0, failedCount: 0, errors: [] };
  }

  const results = await Promise.allSettled(
    taskIds.map(async (id) => {
      const { error } = await supabase
        .from('tasks')
        .update({ sprint, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      return { success: true };
    })
  );

  return processBulkResults(results, taskIds);
}

/**
 * Set assignees for multiple tasks in bulk
 * Replaces all existing assignees with the new list
 */
export async function setAssigneesBulk(
  taskIds: string[],
  userIds: string[]
): Promise<BulkResult> {
  if (taskIds.length === 0) {
    return { success: true, successCount: 0, failedCount: 0, errors: [] };
  }

  const results = await Promise.allSettled(
    taskIds.map(async (taskId) => {
      // Delete existing assignees
      const { error: deleteError } = await supabase
        .from('task_assignees')
        .delete()
        .eq('task_id', taskId);
      
      if (deleteError) throw deleteError;

      // Insert new assignees
      if (userIds.length > 0) {
        const { error: insertError } = await supabase
          .from('task_assignees')
          .insert(userIds.map(userId => ({ task_id: taskId, user_id: userId })));
        
        if (insertError) throw insertError;
      }

      // Update task timestamp
      const { error: updateError } = await supabase
        .from('tasks')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', taskId);
      
      if (updateError) throw updateError;
      
      return { success: true };
    })
  );

  return processBulkResults(results, taskIds);
}

/**
 * Helper to process bulk results consistently
 */
function processBulkResults(
  results: PromiseSettledResult<{ success: boolean }>[],
  taskIds: string[]
): BulkResult {
  const errors: string[] = [];
  let successCount = 0;
  let failedCount = 0;

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      successCount++;
    } else {
      failedCount++;
      errors.push(`Task ${taskIds[index]}: ${result.reason?.message || 'Unknown error'}`);
    }
  });

  return {
    success: failedCount === 0,
    successCount,
    failedCount,
    errors,
  };
}
