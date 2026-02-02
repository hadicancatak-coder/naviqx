/**
 * Task Domain Model - Single Source of Truth
 * All task-related enums, schemas, types, and mappers live here.
 * UI and API MUST import from this file only.
 */

import { z } from 'zod';

// =============================================================================
// IMPORT FROM CONSTANTS - For local use in this file
// =============================================================================

import {
  TaskStatus,
  TaskStatusDB,
  TaskStatusUI,
  STATUS_UI_TO_DB,
  STATUS_DB_TO_UI,
  mapStatusToDb,
  mapStatusToUi,
  type TaskStatusType,
  type TaskStatusDBType,
  type TaskStatusUIType,
} from './constants';

// =============================================================================
// RE-EXPORT FROM CONSTANTS - Single source of truth for status enums/mapping
// =============================================================================

export {
  TaskStatus,
  TaskStatusDB,
  TaskStatusUI,
  STATUS_UI_TO_DB,
  STATUS_DB_TO_UI,
  mapStatusToDb,
  mapStatusToUi,
  type TaskStatusType,
  type TaskStatusDBType,
  type TaskStatusUIType,
} from './constants';

// =============================================================================
// STATUS BEHAVIOR RULES
// =============================================================================

export const statusRequiresReason = (status: string): 'blocked_reason' | 'failure_reason' | null => {
  if (status === TaskStatusUI.Blocked || status === TaskStatusDB.Blocked) return 'blocked_reason';
  if (status === TaskStatusUI.Failed || status === TaskStatusDB.Failed) return 'failure_reason';
  return null;
};

export const isStatusEditable = (status: string): boolean => {
  // Completed tasks are not editable, Failed tasks ARE editable (but need reason)
  return status !== TaskStatusUI.Completed && status !== TaskStatusDB.Completed;
};

// =============================================================================
// PRIORITY ENUM
// =============================================================================

export const TaskPriority = {
  High: 'High',
  Medium: 'Medium',
  Low: 'Low',
} as const;

export type TaskPriorityType = typeof TaskPriority[keyof typeof TaskPriority];

// =============================================================================
// TASK TYPE ENUM
// =============================================================================

export const TaskType = {
  Generic: 'generic',
  Recurring: 'recurring',
  OneOff: 'one-off',
} as const;

export type TaskTypeValue = typeof TaskType[keyof typeof TaskType];

// =============================================================================
// TASK TAGS
// =============================================================================

export const TaskTagValues = {
  Reporting: 'reporting',
  Campaigns: 'campaigns',
  Tech: 'tech',
  Problems: 'problems',
  LearningDevelopment: 'l&d',
  Research: 'research',
} as const;

export type TaskTagType = typeof TaskTagValues[keyof typeof TaskTagValues];

// =============================================================================
// ZOD SCHEMAS
// =============================================================================

// Base task fields without refinements
const taskFieldsSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500, 'Title too long'),
  description: z.string().optional(),
  status: z.enum([
    TaskStatusUI.Backlog,
    TaskStatusUI.Ongoing,
    TaskStatusUI.Blocked,
    TaskStatusUI.Completed,
    TaskStatusUI.Failed,
  ]).default(TaskStatusUI.Backlog),
  priority: z.enum([
    TaskPriority.High,
    TaskPriority.Medium,
    TaskPriority.Low,
  ]).default(TaskPriority.Medium),
  task_type: z.enum([
    TaskType.Generic,
    TaskType.Recurring,
    TaskType.OneOff,
  ]).default(TaskType.Generic),
  due_at: z.string().optional().nullable(),
  entity: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  blocked_reason: z.string().optional().nullable(),
  failure_reason: z.string().optional().nullable(),
  recurrence_rrule: z.string().optional().nullable(),
});

// Refinement function for status-reason validation
const validateStatusReasons = (data: { 
  status?: string; 
  blocked_reason?: string | null; 
  failure_reason?: string | null;
}) => {
  // If status is Blocked, blocked_reason is required
  if (data.status === TaskStatusUI.Blocked && !data.blocked_reason) {
    return false;
  }
  // If status is Failed, failure_reason is required
  if (data.status === TaskStatusUI.Failed && !data.failure_reason) {
    return false;
  }
  return true;
};

export const createTaskSchema = taskFieldsSchema.refine(
  validateStatusReasons,
  { message: 'Blocked/Failed status requires a reason', path: ['status'] }
);

export const updateTaskSchema = taskFieldsSchema.partial().extend({
  id: z.string().uuid(),
}).refine(
  validateStatusReasons,
  { message: 'Blocked/Failed status requires a reason', path: ['status'] }
);

// Type inference from schemas
export type CreateTaskInput = z.infer<typeof taskFieldsSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

// =============================================================================
// UI CONFIGURATION - For rendering components
// =============================================================================

export const TASK_STATUS_OPTIONS = [
  { value: TaskStatus.Backlog, label: 'Backlog', dbValue: TaskStatus.Backlog },
  { value: TaskStatus.Ongoing, label: 'Ongoing', dbValue: TaskStatus.Ongoing },
  { value: TaskStatus.Blocked, label: 'Blocked', dbValue: TaskStatus.Blocked },
  { value: TaskStatus.Completed, label: 'Completed', dbValue: TaskStatus.Completed },
  { value: TaskStatus.Failed, label: 'Failed', dbValue: TaskStatus.Failed },
] as const;

export const TASK_PRIORITY_OPTIONS = [
  { value: TaskPriority.High, label: 'High' },
  { value: TaskPriority.Medium, label: 'Medium' },
  { value: TaskPriority.Low, label: 'Low' },
] as const;

export const TASK_TAG_OPTIONS = [
  { value: TaskTagValues.Reporting, label: 'Reporting' },
  { value: TaskTagValues.Campaigns, label: 'Campaigns' },
  { value: TaskTagValues.Tech, label: 'Tech' },
  { value: TaskTagValues.Problems, label: 'Problems' },
  { value: TaskTagValues.LearningDevelopment, label: 'L&D' },
  { value: TaskTagValues.Research, label: 'Research' },
] as const;

// =============================================================================
// STATUS STYLING CONFIG - For NaviqxBadge
// =============================================================================

export const TASK_STATUS_CONFIG: Record<string, {
  label: string;
  className: string;
  dotColor: string;
}> = {
  [TaskStatusUI.Backlog]: {
    label: 'Backlog',
    className: 'bg-muted text-muted-foreground border-border',
    dotColor: 'bg-muted-foreground',
  },
  [TaskStatusUI.Ongoing]: {
    label: 'Ongoing',
    className: 'bg-info-soft text-info-text border-info/30',
    dotColor: 'bg-info',
  },
  [TaskStatusUI.Blocked]: {
    label: 'Blocked',
    className: 'bg-warning-soft text-warning-text border-warning/30',
    dotColor: 'bg-warning',
  },
  [TaskStatusUI.Completed]: {
    label: 'Completed',
    className: 'bg-success-soft text-success-text border-success/30',
    dotColor: 'bg-success',
  },
  [TaskStatusUI.Failed]: {
    label: 'Failed',
    className: 'bg-destructive-soft text-destructive-text border-destructive/30',
    dotColor: 'bg-destructive',
  },
};

export const TASK_PRIORITY_CONFIG: Record<string, {
  label: string;
  className: string;
  dotColor: string;
}> = {
  [TaskPriority.High]: {
    label: 'High',
    className: 'bg-destructive-soft text-destructive-text border-destructive/30',
    dotColor: 'bg-destructive',
  },
  [TaskPriority.Medium]: {
    label: 'Medium',
    className: 'bg-warning-soft text-warning-text border-warning/30',
    dotColor: 'bg-warning',
  },
  [TaskPriority.Low]: {
    label: 'Low',
    className: 'bg-success-soft text-success-text border-success/30',
    dotColor: 'bg-success',
  },
};

export const TASK_TAG_CONFIG: Record<string, {
  label: string;
  className: string;
}> = {
  [TaskTagValues.Reporting]: {
    label: 'Reporting',
    className: 'bg-primary/15 text-primary border-primary/30',
  },
  [TaskTagValues.Campaigns]: {
    label: 'Campaigns',
    className: 'bg-success/15 text-success border-success/30',
  },
  [TaskTagValues.Tech]: {
    label: 'Tech',
    className: 'bg-info/15 text-info border-info/30',
  },
  [TaskTagValues.Problems]: {
    label: 'Problems',
    className: 'bg-destructive/15 text-destructive border-destructive/30',
  },
  [TaskTagValues.LearningDevelopment]: {
    label: 'L&D',
    className: 'bg-warning/15 text-warning border-warning/30',
  },
  [TaskTagValues.Research]: {
    label: 'Research',
    className: 'bg-accent text-accent-foreground border-border',
  },
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

export const getStatusConfig = (status: string) => {
  const uiStatus = mapStatusToUi(status);
  return TASK_STATUS_CONFIG[uiStatus] || TASK_STATUS_CONFIG[TaskStatusUI.Backlog];
};

export const getPriorityConfig = (priority: string) => {
  return TASK_PRIORITY_CONFIG[priority] || TASK_PRIORITY_CONFIG[TaskPriority.Medium];
};

export const getTagConfig = (tag: string) => {
  return TASK_TAG_CONFIG[tag] || { label: tag, className: 'bg-muted text-muted-foreground border-border' };
};

export const getAllUIStatuses = (): TaskStatusUIType[] => {
  return Object.values(TaskStatusUI);
};

export const getAllDBStatuses = (): TaskStatusDBType[] => {
  return Object.values(TaskStatusDB);
};

// Re-export all actions
export * from './actions';
