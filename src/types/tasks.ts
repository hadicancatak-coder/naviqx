/**
 * Centralized task type definitions
 * Single source of truth for task-related interfaces
 */
import type { Json } from "@/integrations/supabase/types";

export interface TaskAssignee {
  id: string;
  user_id: string;
  name: string;
  username?: string;
  avatar_url?: string | null;
  working_days?: string | null;
}

export interface TaskWithAssignees {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: 'Low' | 'Medium' | 'High';
  due_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
  project_id: string | null;
  phase_id: string | null;
  sprint: string | null;
  labels: string[] | null;
  parent_id: string | null;
  is_collaborative?: boolean;
  is_recurring?: boolean;
  is_recurrence_template?: boolean;
  template_task_id?: string | null;
  recurrence_rrule?: string | null;
  blocker_reason?: string | null;
  failure_reason?: string | null;
  assignees: TaskAssignee[];
  entity?: string | string[] | null;
  teams?: Json;
  board_id?: string | null;
  estimated_hours?: number | null;
  logged_hours?: number | null;
  completion_date?: string | null;
  approval_status?: string | null;
  approval_requested_at?: string | null;
  task_type?: string | null;
  // Allow additional fields from database
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: unknown;
}

/**
 * Realtime assignee structure returned from useRealtimeAssignees hook
 */
export interface RealtimeAssignee {
  id: string;
  user_id: string;
  name: string;
  username?: string;
  avatar_url?: string | null;
  working_days?: string | null;
  profiles?: {
    user_id: string;
  };
}
