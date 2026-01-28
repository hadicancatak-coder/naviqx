/**
 * Centralized React Query keys for consistent cache management
 * All queries MUST use these keys for proper invalidation
 */

// Task keys
export const TASK_QUERY_KEY = ['tasks', false] as const;
export const TASK_WITH_TEMPLATES_KEY = ['tasks', true] as const;
export const TASK_DETAIL_KEY = (taskId: string) => ['task', taskId] as const;

// Resource keys (Knowledge, Projects, Tech Stack)
export const KNOWLEDGE_QUERY_KEY = ['knowledge-pages'] as const;
export const PROJECTS_QUERY_KEY = ['projects'] as const;
export const TECH_STACK_QUERY_KEY = ['tech-stack-pages'] as const;

// Dashboard & Campaigns
export const DASHBOARD_QUERY_KEY = ['dashboard'] as const;
export const UTM_CAMPAIGNS_QUERY_KEY = ['utm-campaigns'] as const;
export const ACCOUNT_STRUCTURE_KEYS = {
  entities: ['entity-presets'] as const,
  campaigns: ['search-campaigns-structure'] as const,
  adGroups: ['ad-groups-structure'] as const,
  ads: ['ads-structure'] as const,
  versionCounts: ['version-counts'] as const,
} as const;
