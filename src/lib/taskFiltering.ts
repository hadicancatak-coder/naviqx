/**
 * Centralized task filtering utilities
 * Ensures consistent ID handling across all task views
 */

export interface TaskAssignee {
  id?: string;          // profiles.id
  user_id?: string;     // profiles.user_id (auth.users.id)
  name?: string;
  avatar_url?: string;
  profiles?: {
    id?: string;
    user_id?: string;
    name?: string;
    avatar_url?: string;
  };
}

export interface TaskWithAssignees {
  id: string;
  title?: string;
  status?: string;
  priority?: string;
  due_at?: string;
  assignees?: TaskAssignee[];
  task_assignees?: { user_id: string; profiles?: TaskAssignee }[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

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
      const userId = assignee.user_id || assignee.profiles?.user_id;
      return userId === authUserId;
    });
  }
  
  // Fallback: check raw task_assignees if assignees not populated
  if (task.task_assignees && task.task_assignees.length > 0) {
    return task.task_assignees.some((ta) => {
      const userId = ta.profiles?.user_id;
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
      const userId = assignee.user_id || assignee.profiles?.user_id;
      return userId && selectedUserIds.includes(userId);
    });
  }
  
  return false;
}

/**
 * Get all auth user IDs from a task's assignees
 * Useful for UI display and filtering logic
 */
export function getTaskAssigneeUserIds(task: TaskWithAssignees): string[] {
  if (!task.assignees) return [];
  
  return task.assignees
    .map((assignee) => assignee.user_id || assignee.profiles?.user_id)
    .filter((id): id is string => !!id);
}
