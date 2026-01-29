import { z } from "zod";
import { ENTITIES, TASK_STATUSES } from "./constants";

// Extract status values from centralized constants
const statusValues = TASK_STATUSES.map(s => s.value) as [string, ...string[]];

// Task validation schema
export const taskSchema = z.object({
  title: z.string()
    .trim()
    .min(1, "Title is required")
    .max(200, "Title must be less than 200 characters")
    .regex(/^[^<>]*$/, "Title cannot contain < or > characters"),
  
  description: z.string()
    .max(5000, "Description must be less than 5000 characters")
    .optional()
    .or(z.literal('')),
  
  jira_link: z.string()
    .url("Invalid URL format")
    .max(500, "URL too long")
    .optional()
    .or(z.literal('')),
  
  jira_key: z.string()
    .max(50, "Jira key too long")
    .optional()
    .or(z.literal('')),
  
  entity: z.array(z.enum(ENTITIES as [string, ...string[]])).optional(),
  
  priority: z.enum(["Low", "Medium", "High"]),
  
  status: z.enum(statusValues),
  
  recurrence_rrule: z.string()
    .regex(/^(FREQ=(DAILY|WEEKLY|MONTHLY|YEARLY).*)?$/, "Invalid recurrence rule format")
    .optional()
    .or(z.literal('')),
  
  recurrence_day_of_week: z.number()
    .int()
    .min(0, "Day of week must be 0-6")
    .max(6, "Day of week must be 0-6")
    .optional()
    .nullable(),
  
  recurrence_day_of_month: z.number()
    .int()
    .min(1, "Day of month must be 1-31")
    .max(31, "Day of month must be 1-31")
    .optional()
    .nullable(),
  
  assignee_id: z.string().uuid().optional().nullable(),
  project_id: z.string().uuid().optional().nullable(),
  due_at: z.string().datetime().optional().nullable(),
  task_type: z.enum(["generic", "campaign", "recurring"]).optional(),
});

// Working days validation schema
export const workingDaysSchema = z.enum(['mon-fri', 'sun-thu']);

// User role validation schema
export const userRoleSchema = z.enum(['admin', 'member']);

// Profile update validation schema
export const profileUpdateSchema = z.object({
  name: z.string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Name too long")
    .regex(/^[^<>]*$/, "Name cannot contain < or > characters"),
  
  username: z.string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(50, "Username too long")
    .regex(/^[a-zA-Z0-9_-]*$/, "Username can only contain letters, numbers, - and _")
    .optional()
    .or(z.literal('')),
  
  title: z.string()
    .max(100, "Title too long")
    .optional()
    .or(z.literal('')),
  
  tagline: z.string()
    .max(200, "Tagline too long")
    .optional()
    .or(z.literal('')),
  
  phone_number: z.string()
    .regex(/^\+?[0-9\s-()]*$/, "Invalid phone number format")
    .max(20, "Phone number too long")
    .optional()
    .or(z.literal('')),
  
  working_days: workingDaysSchema,
});

// Blocker validation schema
export const blockerSchema = z.object({
  title: z.string()
    .trim()
    .min(1, "Title is required")
    .max(200, "Title too long")
    .regex(/^[^<>]*$/, "Title cannot contain < or > characters"),
  
  description: z.string()
    .max(2000, "Description too long")
    .optional()
    .or(z.literal('')),
  
  stuck_reason: z.string()
    .max(1000, "Stuck reason too long")
    .optional()
    .or(z.literal('')),
  
  fix_process: z.string()
    .max(2000, "Fix process too long")
    .optional()
    .or(z.literal('')),
  
  timeline: z.string()
    .max(500, "Timeline too long")
    .optional()
    .or(z.literal('')),
  
  task_id: z.string().uuid("Invalid task ID"),
  due_date: z.string().datetime().optional().nullable(),
});

// Comment validation schema
export const commentSchema = z.object({
  body: z.string()
    .trim()
    .min(1, "Comment cannot be empty")
    .max(5000, "Comment too long"),
  
  task_id: z.string().uuid("Invalid task ID"),
});

// Campaign validation schema
export const campaignSchema = z.object({
  title: z.string()
    .trim()
    .min(1, "Title is required")
    .max(200, "Title too long")
    .regex(/^[^<>]*$/, "Title cannot contain < or > characters"),
  
  description: z.string()
    .max(5000, "Description too long")
    .optional()
    .or(z.literal('')),
  
  target: z.string()
    .trim()
    .min(1, "Target is required")
    .max(500, "Target too long"),
  
  lp_link: z.string()
    .url("Invalid URL format")
    .max(500, "URL too long")
    .optional()
    .or(z.literal('')),
  
  entity: z.array(z.enum(ENTITIES as [string, ...string[]])).optional(),
  
  start_date: z.string().datetime(),
  end_date: z.string().datetime(),
});

// Ad validation schema
export const adSchema = z.object({
  name: z.string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Name too long")
    .regex(/^[^<>]*$/, "Name cannot contain < or > characters"),
  
  headlines: z.array(z.string().max(30, "Headline too long")).min(3, "At least 3 headlines required"),
  descriptions: z.array(z.string().max(90, "Description too long")).min(2, "At least 2 descriptions required"),
  sitelinks: z.array(z.string().max(25, "Sitelink too long")),
  callouts: z.array(z.string().max(25, "Callout too long")),
  
  landing_page: z.string()
    .url("Invalid URL format")
    .max(500, "URL too long")
    .optional()
    .or(z.literal('')),
  
  entity: z.array(z.enum(ENTITIES as [string, ...string[]])).optional(),
});

// Auth password validation schema (strong password requirements)
export const authPasswordSchema = z.string()
  .min(9, "Password must be at least 9 characters")
  .regex(/[A-Z]/, "Must contain at least one uppercase letter")
  .regex(/[0-9]/, "Must contain at least one number")
  .regex(/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/, "Must contain at least one special character (including _)");
