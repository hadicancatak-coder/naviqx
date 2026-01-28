/**
 * Task Status Constants - Shared by index.ts and actions.ts
 * Extracted to avoid circular imports between domain/index and domain/actions
 */

// =============================================================================
// ENUMS - Database values (what gets stored)
// =============================================================================

export const TaskStatusDB = {
  Pending: 'Pending',
  Ongoing: 'Ongoing',
  Blocked: 'Blocked',
  Completed: 'Completed',
  Failed: 'Failed',
} as const;

export type TaskStatusDBType = typeof TaskStatusDB[keyof typeof TaskStatusDB];

// =============================================================================
// ENUMS - UI values (what users see)
// =============================================================================

export const TaskStatusUI = {
  Backlog: 'Backlog',
  Ongoing: 'Ongoing',
  Blocked: 'Blocked',
  Completed: 'Completed',
  Failed: 'Failed',
} as const;

export type TaskStatusUIType = typeof TaskStatusUI[keyof typeof TaskStatusUI];

// =============================================================================
// STATUS MAPPING - Bidirectional
// =============================================================================

export const STATUS_UI_TO_DB: Record<TaskStatusUIType, TaskStatusDBType> = {
  [TaskStatusUI.Backlog]: TaskStatusDB.Pending,
  [TaskStatusUI.Ongoing]: TaskStatusDB.Ongoing,
  [TaskStatusUI.Blocked]: TaskStatusDB.Blocked,
  [TaskStatusUI.Completed]: TaskStatusDB.Completed,
  [TaskStatusUI.Failed]: TaskStatusDB.Failed,
};

export const STATUS_DB_TO_UI: Record<TaskStatusDBType, TaskStatusUIType> = {
  [TaskStatusDB.Pending]: TaskStatusUI.Backlog,
  [TaskStatusDB.Ongoing]: TaskStatusUI.Ongoing,
  [TaskStatusDB.Blocked]: TaskStatusUI.Blocked,
  [TaskStatusDB.Completed]: TaskStatusUI.Completed,
  [TaskStatusDB.Failed]: TaskStatusUI.Failed,
};

export const mapStatusToDb = (uiStatus: string): TaskStatusDBType => {
  return STATUS_UI_TO_DB[uiStatus as TaskStatusUIType] || (uiStatus as TaskStatusDBType);
};

export const mapStatusToUi = (dbStatus: string): TaskStatusUIType => {
  return STATUS_DB_TO_UI[dbStatus as TaskStatusDBType] || (dbStatus as TaskStatusUIType);
};
