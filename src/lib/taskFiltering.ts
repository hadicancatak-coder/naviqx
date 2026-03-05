/**
 * Centralized task filtering utilities
 * Ensures consistent ID handling across all task views
 */

import type { TaskAssignee, TaskWithAssignees } from '@/types/tasks';

/**
 * Check if a specific user (by auth user ID) is assigned to a task
 * Handles both normalized assignees array and raw task_assignees join
 * 
 * @param task - Task object with assignees
 * @param authUserId - The auth.users.id (from useAuth().user.id)
 * @returns boolean
 */
export function isUserAssignedToTask(task: TaskWithAssignees, authUserId: string | undefined): boolean {
  if (!authUserId) return false;
  
  // Check normalized assignees array (from useTasks hook)
  if (task.assignees && task.assignees.length > 0) {
    return task.assignees.some((assignee) => {
      // assignee.user_id is profiles.user_id which equals auth.users.id
      const userId = assignee.user_id;
      return userId === authUserId;
    });
  }
  
  return false;
}

/**
 * Check if a task matches any of the selected assignee IDs
 * Used for multi-select assignee filtering
 * 
 * @param task - Task object with assignees
 * @param selectedUserIds - Array of auth.users.id values
 * @returns boolean
 */
export function taskMatchesAssigneeFilter(task: TaskWithAssignees, selectedUserIds: string[]): boolean {
  if (selectedUserIds.length === 0) return true;
  
  if (task.assignees && task.assignees.length > 0) {
    return task.assignees.some((assignee) => {
      const userId = assignee.user_id;
      return userId && selectedUserIds.includes(userId);
    });
  }
  
  return false;
}
