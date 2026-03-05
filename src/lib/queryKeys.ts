/**
 * Centralized React Query keys for consistent cache management
 * All queries MUST use these keys for proper invalidation
 */

// Task keys
export const TASK_QUERY_KEY = ['tasks', false] as const;
export const TASK_WITH_TEMPLATES_KEY = ['tasks', true] as const;
export const TASK_DETAIL_KEY = (taskId: string) => ['task', taskId] as const;

// Account structure keys (used by campaign versioning)
export const ACCOUNT_STRUCTURE_KEYS = {
  versionCounts: ['version-counts'] as const,
} as const;
