import { differenceInDays } from "date-fns";

/**
 * Determines if a task is "stale" - ongoing but not updated in 7+ days
 */
export function isTaskStale(task: any, staleDays: number = 7): boolean {
  if (!task) return false;
  
  // Only ongoing/in-progress tasks can be stale
  const ongoingStatuses = ['Ongoing', 'In Progress'];
  if (!ongoingStatuses.includes(task.status)) return false;
  
  // Check if updated_at is older than staleDays
  if (!task.updated_at) return false;
  
  const daysSinceUpdate = differenceInDays(new Date(), new Date(task.updated_at));
  return daysSinceUpdate >= staleDays;
}

/**
 * Get the number of days since a task was last updated
 */
export function getDaysSinceUpdate(task: any): number {
  if (!task?.updated_at) return 0;
  return differenceInDays(new Date(), new Date(task.updated_at));
}

/**
 * Get stale task warning level
 */
export function getStaleLevel(task: any): 'none' | 'warning' | 'critical' {
  const days = getDaysSinceUpdate(task);
  if (days >= 14) return 'critical';
  if (days >= 7) return 'warning';
  return 'none';
}
