/**
 * Task Domain Model - Single Source of Truth
 * All task-related enums, schemas, types, and mappers live here.
 * UI and API MUST import from this file only.
 */

// =============================================================================
// RE-EXPORT FROM CONSTANTS - Single source of truth for status enums/mapping
// =============================================================================

export {
  TaskStatus,
  mapStatusToDb,
  mapStatusToUi,
  type TaskStatusType,
} from './constants';

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

// =============================================================================
// UI CONFIGURATION - For rendering components
// =============================================================================

import { TaskStatus } from './constants';

export const TASK_STATUS_OPTIONS = [
  { value: TaskStatus.Backlog, label: 'Backlog', dbValue: TaskStatus.Backlog },
  { value: TaskStatus.Ongoing, label: 'Ongoing', dbValue: TaskStatus.Ongoing },
  { value: TaskStatus.Blocked, label: 'Blocked', dbValue: TaskStatus.Blocked },
  { value: TaskStatus.Completed, label: 'Completed', dbValue: TaskStatus.Completed },
  { value: TaskStatus.Failed, label: 'Failed', dbValue: TaskStatus.Failed },
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

import { mapStatusToUi } from './constants';

export const TASK_STATUS_CONFIG: Record<string, {
  label: string;
  className: string;
  dotColor: string;
}> = {
  [TaskStatus.Backlog]: {
    label: 'Backlog',
    className: 'bg-muted text-muted-foreground border-border',
    dotColor: 'bg-muted-foreground',
  },
  [TaskStatus.Ongoing]: {
    label: 'Ongoing',
    className: 'bg-info-soft text-info-text border-info/30',
    dotColor: 'bg-info',
  },
  [TaskStatus.Blocked]: {
    label: 'Blocked',
    className: 'bg-warning-soft text-warning-text border-warning/30',
    dotColor: 'bg-warning',
  },
  [TaskStatus.Completed]: {
    label: 'Completed',
    className: 'bg-success-soft text-success-text border-success/30',
    dotColor: 'bg-success',
  },
  [TaskStatus.Failed]: {
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
  return TASK_STATUS_CONFIG[uiStatus] || TASK_STATUS_CONFIG[TaskStatus.Backlog];
};

export const getPriorityConfig = (priority: string) => {
  return TASK_PRIORITY_CONFIG[priority] || TASK_PRIORITY_CONFIG[TaskPriority.Medium];
};

export const getTagConfig = (tag: string) => {
  return TASK_TAG_CONFIG[tag] || { label: tag, className: 'bg-muted text-muted-foreground border-border' };
};

// Re-export all actions
export * from './actions';
