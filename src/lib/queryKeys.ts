/**
 * Centralized React Query keys for consistent cache management
 * All task-related queries and mutations MUST use these keys
 */

export const TASK_QUERY_KEY = ['tasks', false] as const;

// For templates-included queries (rare use)
export const TASK_WITH_TEMPLATES_KEY = ['tasks', true] as const;
