/**
 * Centralized constants for the application
 * All entity/country lists and team definitions should use these constants
 */

export const ENTITIES = [
  "Global Management",
  "Jordan",
  "UAE",
  "Lebanon",
  "Kuwait",
  "Iraq",
  "UK",
  "Nigeria",
  "Qatar",
  "India",
  "South Africa",
  "Egypt",
  "Malaysia",
  "Chile",
  "Vietnam",
  "Bahrain",
  "Palestine",
  "Azerbaijan",
  "Seychelles",
  "Mauritius",
  "Vanuatu"
];

export const TEAMS = ["SocialUA", "PPC", "PerMar"];

// Display labels for teams (for UI)
export const TEAM_LABELS: Record<string, string> = {
  "SocialUA": "Social UA",
  "PPC": "PPC",
  "PerMar": "Performance Marketing"
};

/**
 * Task Statuses - Single Source of Truth
 * UI uses these values, mapper converts to DB values when needed
 * @deprecated Import from '@/domain' instead for new code
 */
export const TASK_STATUSES = [
  { value: "Backlog", label: "Backlog", dbValue: "Pending" },
  { value: "Ongoing", label: "Ongoing", dbValue: "Ongoing" },
  { value: "Blocked", label: "Blocked", dbValue: "Blocked" },
  { value: "Completed", label: "Completed", dbValue: "Completed" },
  { value: "Failed", label: "Failed", dbValue: "Failed" },
] as const;

export type TaskStatus = typeof TASK_STATUSES[number]['value'];

/**
 * Task Tags - Single Source of Truth
 */
export const TASK_TAGS = [
  { value: "reporting", label: "Reporting", color: "bg-primary/15 text-primary border-primary/30" },
  { value: "campaigns", label: "Campaigns", color: "bg-success/15 text-success border-success/30" },
  { value: "campaign", label: "Campaign", color: "bg-success/15 text-success border-success/30" },
  { value: "tech", label: "Tech", color: "bg-info/15 text-info border-info/30" },
  { value: "problems", label: "Problems", color: "bg-destructive/15 text-destructive border-destructive/30" },
  { value: "l&d", label: "L&D", color: "bg-warning/15 text-warning border-warning/30" },
  { value: "research", label: "Research", color: "bg-accent text-accent-foreground border-border" },
  { value: "urgent", label: "Urgent", color: "bg-destructive/15 text-destructive border-destructive/30" },
  { value: "feature", label: "Feature", color: "bg-info/15 text-info border-info/30" },
  { value: "client", label: "Client", color: "bg-primary/15 text-primary border-primary/30" },
  { value: "review", label: "Review", color: "bg-warning/15 text-warning border-warning/30" },
  { value: "google", label: "Google", color: "bg-success/15 text-success border-success/30" },
  { value: "meta", label: "Meta", color: "bg-info/15 text-info border-info/30" },
  { value: "mobile", label: "Mobile", color: "bg-accent text-accent-foreground border-border" },
] as const;

export type TaskTag = typeof TASK_TAGS[number]['value'];

export const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];

/**
 * Editor Colors - Single Source of Truth for rich text editors
 */
export const EDITOR_COLORS = [
  { name: 'Default', value: '' },
  { name: 'Red', value: 'hsl(var(--destructive))' },
  { name: 'Orange', value: 'hsl(var(--warning))' },
  { name: 'Yellow', value: 'hsl(45 93% 47%)' },
  { name: 'Green', value: 'hsl(var(--success))' },
  { name: 'Blue', value: 'hsl(var(--info))' },
  { name: 'Purple', value: 'hsl(270 60% 60%)' },
  { name: 'Pink', value: 'hsl(330 80% 60%)' },
] as const;

/**
 * Status Colors - Single Source of Truth for status badges
 * Maps status values to semantic color classes
 */
export const STATUS_COLORS = {
  // Approval statuses
  approved: 'bg-success-soft text-success-text border-success/30',
  pending: 'bg-pending-soft text-pending-text border-pending/30',
  draft: 'bg-muted text-muted-foreground border-border',
  rejected: 'bg-destructive-soft text-destructive-text border-destructive/30',
  
  // Activity statuses
  active: 'bg-success-soft text-success-text border-success/30',
  inactive: 'bg-muted text-muted-foreground border-border',
  
  // Task/item statuses  
  completed: 'bg-success-soft text-success-text border-success/30',
  in_progress: 'bg-info-soft text-info-text border-info/30',
  archived: 'bg-muted text-muted-foreground border-border',
  failed: 'bg-destructive-soft text-destructive-text border-destructive/30',
  
  // Default fallback
  default: 'bg-muted text-muted-foreground border-border',
} as const;

/**
 * Badge variant mapping for status - maps to shadcn badge variants
 */
export const STATUS_BADGE_VARIANTS = {
  approved: 'default' as const,
  pending: 'secondary' as const,
  draft: 'outline' as const,
  rejected: 'destructive' as const,
  active: 'default' as const,
  inactive: 'outline' as const,
  completed: 'default' as const,
  in_progress: 'secondary' as const,
  archived: 'outline' as const,
  failed: 'destructive' as const,
  default: 'secondary' as const,
} as const;

/**
 * Tool/Feature Colors - Centralized color palette for cards, icons
 * Uses CSS-compatible hex values for inline styles
 */
export const TOOL_COLORS = {
  blue: '#3B82F6',    // Primary blue
  purple: '#8B5CF6',  // Purple/violet
  amber: '#F59E0B',   // Amber/orange
  cyan: '#06B6D4',    // Cyan/teal
  green: '#10B981',   // Green/emerald
  red: '#EF4444',     // Red
  pink: '#EC4899',    // Pink
  indigo: '#6366F1',  // Indigo
} as const;

export type ToolColorKey = keyof typeof TOOL_COLORS;

/**
 * Get status color classes for a given status
 */
export function getStatusColor(status: string): string {
  const normalizedStatus = status?.toLowerCase().replace(/\s+/g, '_') || 'default';
  return STATUS_COLORS[normalizedStatus as keyof typeof STATUS_COLORS] || STATUS_COLORS.default;
}

/**
 * Get badge variant for a given status
 */
export function getStatusBadgeVariant(status: string): 'default' | 'secondary' | 'outline' | 'destructive' {
  const normalizedStatus = status?.toLowerCase().replace(/\s+/g, '_') || 'default';
  return STATUS_BADGE_VARIANTS[normalizedStatus as keyof typeof STATUS_BADGE_VARIANTS] || STATUS_BADGE_VARIANTS.default;
}

export type Entity = typeof ENTITIES[number];
export type Team = typeof TEAMS[number];
export type Month = typeof MONTHS[number];
export type StatusColor = keyof typeof STATUS_COLORS;
