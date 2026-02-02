/**
 * Task Status Constants - Single Source of Truth
 * UI and DB now use the same values: Backlog, Ongoing, Blocked, Completed, Failed
 */

// =============================================================================
// UNIFIED STATUS ENUM - Same values for UI and DB
// =============================================================================

export const TaskStatus = {
  Backlog: 'Backlog',
  Ongoing: 'Ongoing',
  Blocked: 'Blocked',
  Completed: 'Completed',
  Failed: 'Failed',
} as const;

export type TaskStatusType = typeof TaskStatus[keyof typeof TaskStatus];

// =============================================================================
// LEGACY ALIASES - For backward compatibility during migration
// =============================================================================

/** @deprecated Use TaskStatus instead */
export const TaskStatusDB = TaskStatus;
/** @deprecated Use TaskStatusType instead */
export type TaskStatusDBType = TaskStatusType;

/** @deprecated Use TaskStatus instead */
export const TaskStatusUI = TaskStatus;
/** @deprecated Use TaskStatusType instead */
export type TaskStatusUIType = TaskStatusType;

// =============================================================================
// STATUS MAPPING - Now simple pass-through since UI = DB
// =============================================================================

export const STATUS_UI_TO_DB: Record<TaskStatusType, TaskStatusType> = {
  [TaskStatus.Backlog]: TaskStatus.Backlog,
  [TaskStatus.Ongoing]: TaskStatus.Ongoing,
  [TaskStatus.Blocked]: TaskStatus.Blocked,
  [TaskStatus.Completed]: TaskStatus.Completed,
  [TaskStatus.Failed]: TaskStatus.Failed,
};

export const STATUS_DB_TO_UI: Record<TaskStatusType, TaskStatusType> = {
  [TaskStatus.Backlog]: TaskStatus.Backlog,
  [TaskStatus.Ongoing]: TaskStatus.Ongoing,
  [TaskStatus.Blocked]: TaskStatus.Blocked,
  [TaskStatus.Completed]: TaskStatus.Completed,
  [TaskStatus.Failed]: TaskStatus.Failed,
};

/**
 * Maps UI status to DB status (now identity function since they match)
 */
export const mapStatusToDb = (status: string): TaskStatusType => {
  // Handle legacy 'Pending' values that might still exist
  if (status === 'Pending') return TaskStatus.Backlog;
  return (STATUS_UI_TO_DB[status as TaskStatusType] || status) as TaskStatusType;
};

/**
 * Maps DB status to UI status (now identity function since they match)
 */
export const mapStatusToUi = (status: string): TaskStatusType => {
  // Handle legacy 'Pending' values that might still exist
  if (status === 'Pending') return TaskStatus.Backlog;
  return (STATUS_DB_TO_UI[status as TaskStatusType] || status) as TaskStatusType;
};
