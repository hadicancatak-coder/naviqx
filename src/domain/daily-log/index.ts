export const DAILY_LOG_STATUSES = [
  { value: 'Planned',     label: 'Planned',     bgClass: 'bg-pending-soft',     textClass: 'text-pending-text' },
  { value: 'In Progress', label: 'In Progress',  bgClass: 'bg-info-soft',        textClass: 'text-info-text' },
  { value: 'Done',        label: 'Done',         bgClass: 'bg-success-soft',     textClass: 'text-success-text' },
  { value: 'Blocked',     label: 'Blocked',      bgClass: 'bg-destructive-soft', textClass: 'text-destructive-text' },
  { value: 'Skipped',     label: 'Skipped',      bgClass: 'bg-muted',            textClass: 'text-muted-foreground' },
  { value: 'Moved',       label: 'Moved',        bgClass: 'bg-warning-soft',     textClass: 'text-warning-text' },
] as const;

export type DailyLogStatus = typeof DAILY_LOG_STATUSES[number]['value'];
export type DailyLogPriority = 'High' | 'Medium' | 'Low';
export type RecurPattern = 'Daily' | 'Weekly' | 'Monthly';

export interface DailyLogEntry {
  id: string;
  user_id: string;
  log_date: string;
  title: string;
  status: DailyLogStatus;
  priority: DailyLogPriority | null;
  due_date: string | null;
  needs_help: boolean;
  is_recurring: boolean;
  recur_pattern: RecurPattern | null;
  linked_task_id: string | null;
  notes: string | null;
  sort_order: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // joined
  linked_task?: { id: string; title: string; status: string } | null;
}
