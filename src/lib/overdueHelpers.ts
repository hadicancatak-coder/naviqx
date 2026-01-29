import type { UnsafeAny } from '@/types/unsafe';

/**
 * Centralized utilities for overdue task logic
 * Ensures consistency across all components
 */

/**
 * Determine if a task is overdue
 * Excludes Backlog and Completed statuses
 */
export function isTaskOverdue(task: UnsafeAny): boolean {
  if (!task.due_at) return false;
  if (task.status === 'Completed') return false;
  if (task.status === 'Pending') return false;
  
  const dueDate = new Date(task.due_at);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return dueDate < today;
}

/**
 * Calculate days overdue
 */
export function getDaysOverdue(dueDate: string | Date): number {
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const diffTime = today.getTime() - due.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Get overdue badge variant
 */
export function getOverdueBadgeVariant(daysOverdue: number): 'destructive' | 'warning' {
  return daysOverdue > 7 ? 'destructive' : 'warning';
}

/**
 * Format overdue text (e.g., "3 days overdue")
 */
export function formatOverdueText(dueDate: string | Date): string {
  const days = getDaysOverdue(dueDate);
  return `${days} day${days !== 1 ? 's' : ''} overdue`;
}
