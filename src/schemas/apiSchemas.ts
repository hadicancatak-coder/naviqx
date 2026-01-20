import { z } from 'zod';

// ============= USER & PROFILE SCHEMAS =============
export const profileSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  name: z.string().min(1).max(100),
  email: z.string().email().max(255),
  username: z.string().max(50).nullable(),
  avatar_url: z.string().url().nullable(),
  title: z.string().max(100).nullable(),
  phone_number: z.string().max(20).nullable(),
  working_days: z.string().nullable(),
  teams: z.array(z.string()).nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  mfa_enabled: z.boolean().default(false),
});

export const userRoleSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  role: z.enum(['admin', 'member']),
  created_at: z.string().datetime(),
});

// ============= TASK SCHEMAS =============
// Note: Database uses 'Pending' but UI uses 'Backlog' - mapped via taskStatusMapper
export const taskStatusSchema = z.enum([
  'Backlog',
  'Ongoing',
  'Blocked',
  'Completed',
]);

export const taskPrioritySchema = z.enum(['Low', 'Medium', 'High', 'Critical']);

export const taskTypeSchema = z.enum([
  'generic',
  'campaign',
  'recurring'
]);

export const taskSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(5000).nullable(),
  status: taskStatusSchema,
  priority: taskPrioritySchema,
  task_type: taskTypeSchema.nullable(),
  due_at: z.string().datetime().nullable(),
  completed_at: z.string().datetime().nullable(),
  created_by: z.string().uuid(),
  updated_by: z.string().uuid().nullable(),
  assignee_id: z.string().uuid().nullable(),
  campaign_id: z.string().uuid().nullable(),
  project_id: z.string().uuid().nullable(),
  teams: z.array(z.string()).nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const taskAssigneeSchema = z.object({
  task_id: z.string().uuid(),
  user_id: z.string().uuid(),
  assigned_by: z.string().uuid().nullable(),
  assigned_at: z.string().datetime(),
});

// ============= CAMPAIGN SCHEMAS =============
export const campaignStatusSchema = z.enum([
  'planning',
  'ready',
  'live',
  'orbit',
  'completed',
  'cancelled'
]);

export const launchCampaignSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().nullable(),
  status: campaignStatusSchema,
  launch_date: z.string().datetime().nullable(),
  launched_at: z.string().datetime().nullable(),
  created_by: z.string().uuid(),
  updated_by: z.string().uuid().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// ============= AD SCHEMAS =============
export const adTypeSchema = z.enum(['search', 'display', 'social']);

export const adApprovalStatusSchema = z.enum([
  'draft',
  'pending',
  'approved',
  'rejected',
  'changes_requested'
]);

export const adLanguageSchema = z.enum(['EN', 'AR']);

export const searchAdSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200),
  ad_type: adTypeSchema,
  approval_status: adApprovalStatusSchema,
  language: adLanguageSchema.nullable(),
  headlines: z.array(z.object({
    text: z.string().max(30)
  })).max(15),
  descriptions: z.array(z.object({
    text: z.string().max(90)
  })).max(4),
  business_name: z.string().max(25).nullable(),
  final_url: z.string().url().nullable(),
  path1: z.string().max(15).nullable(),
  path2: z.string().max(15).nullable(),
  created_by: z.string().uuid(),
  campaign_id: z.string().uuid().nullable(),
  ad_group_id: z.string().uuid().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// ============= KPI SCHEMAS =============
export const kpiSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().nullable(),
  weight: z.number().min(0).max(100),
  target_value: z.number().nullable(),
  current_value: z.number().nullable(),
  status: z.enum(['on_track', 'at_risk', 'off_track']).nullable(),
  assignee_id: z.string().uuid().nullable(),
  team: z.string().nullable(),
  due_date: z.string().datetime().nullable(),
  created_by: z.string().uuid(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// ============= NOTIFICATION SCHEMAS =============
export const notificationTypeSchema = z.enum([
  'task_assigned',
  'task_status_changed',
  'task_team_assigned',
  'comment_mention',
  'blocker_created',
  'blocker_resolved',
  'campaign_status_changed',
  'campaign_assigned',
  'ad_pending_review',
  'ad_status_changed'
]);

export const notificationSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  type: notificationTypeSchema,
  payload_json: z.record(z.any()),
  read_at: z.string().datetime().nullable(),
  created_at: z.string().datetime(),
});

// ============= OPERATIONS SCHEMAS =============
export const auditLogSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().nullable(),
  platform: z.string().min(1).max(100),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']),
  deadline: z.string().datetime().nullable(),
  created_by: z.string().uuid(),
  task_id: z.string().uuid().nullable(),
  auto_assigned: z.boolean().default(false),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// ============= UTM SCHEMAS =============
export const utmLinkSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200),
  base_url: z.string().url(),
  utm_source: z.string().min(1).max(100),
  utm_medium: z.string().min(1).max(100),
  utm_campaign: z.string().min(1).max(200),
  utm_term: z.string().max(100).nullable(),
  utm_content: z.string().max(100).nullable(),
  created_by: z.string().uuid(),
  updated_by: z.string().uuid().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// ============= WEB INTEL SCHEMAS =============
export const webIntelSiteSchema = z.object({
  id: z.string().uuid(),
  url: z.string().url(),
  name: z.string().min(1).max(200),
  category: z.string().max(100).nullable(),
  status: z.enum(['active', 'inactive', 'monitoring']).nullable(),
  notes: z.string().nullable(),
  tags: z.array(z.string()).nullable(),
  created_by: z.string().uuid(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// ============= MFA SCHEMAS =============
export const mfaSessionSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  session_token: z.string().min(32),
  ip_address: z.string(),
  user_agent: z.string(),
  expires_at: z.string().datetime(),
  skip_validation_for_ip: z.boolean().default(false),
  created_at: z.string().datetime(),
});

export const mfaVerificationRequestSchema = z.object({
  otpCode: z.string().length(6).regex(/^\d+$/, "OTP must be 6 digits").or(
    z.string().length(8).regex(/^[A-Z0-9]+$/, "Backup code must be 8 uppercase alphanumeric characters")
  ),
  isBackupCode: z.boolean(),
});

export const mfaSessionActionSchema = z.object({
  action: z.enum(['create', 'validate', 'cleanup']),
  sessionToken: z.string().optional(),
});

// ============= VALIDATION HELPERS =============
export function validateApiResponse<T>(schema: z.ZodSchema<T>, data: unknown): { 
  success: true; 
  data: T 
} | { 
  success: false; 
  errors: z.ZodError 
} {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

export function validateApiRequest<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}
