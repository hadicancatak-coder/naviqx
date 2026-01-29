import { differenceInDays } from "date-fns";

/** Minimal task interface for stale checking */
interface StaleCheckTask {
  status?: string;
  updated_at?: string;
}

/**
 * Determines if a task is "stale" - ongoing but not updated in 7+ days
 */
export function isTaskStale(task: StaleCheckTask | null | undefined, staleDays: number = 7): boolean {
  if (!task) return false;
  
  // Only ongoing/in-progress tasks can be stale
  const ongoingStatuses = ['Ongoing', 'In Progress'];
  if (!task.status || !ongoingStatuses.includes(task.status)) return false;
  
  // Check if updated_at is older than staleDays
  if (!task.updated_at) return false;
  
  const daysSinceUpdate = differenceInDays(new Date(), new Date(task.updated_at));
  return daysSinceUpdate >= staleDays;
}

/**
 * Get the number of days since a task was last updated
 */
export function getDaysSinceUpdate(task: StaleCheckTask | null | undefined): number {
  if (!task?.updated_at) return 0;
  return differenceInDays(new Date(), new Date(task.updated_at));
}

/**
 * Get stale task warning level
 */
export function getStaleLevel(task: StaleCheckTask | null | undefined): 'none' | 'warning' | 'critical' {
  const days = getDaysSinceUpdate(task);
  if (days >= 14) return 'critical';
  if (days >= 7) return 'warning';
  return 'none';
}
