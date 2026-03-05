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
// STATUS MAPPING - Simple pass-through since UI = DB
// Kept as functions to handle legacy 'Pending' values
// =============================================================================

/**
 * Maps UI status to DB status (identity + legacy 'Pending' handling)
 */
export const mapStatusToDb = (status: string): TaskStatusType => {
  if (status === 'Pending') return TaskStatus.Backlog;
  return (status in TaskStatus ? status : status) as TaskStatusType;
};

/**
 * Maps DB status to UI status (identity + legacy 'Pending' handling)
 */
export const mapStatusToUi = (status: string): TaskStatusType => {
  if (status === 'Pending') return TaskStatus.Backlog;
  return (status in TaskStatus ? status : status) as TaskStatusType;
};
