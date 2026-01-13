import { addDays, addWeeks, addMonths, format, startOfDay, isBefore, isAfter, parseISO } from 'date-fns';

export interface RecurrenceRule {
  type: 'none' | 'daily' | 'weekly' | 'monthly' | 'custom';
  interval: number;
  days_of_week?: string[]; // ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
  day_of_month?: number;
  end_condition: 'never' | 'after_n' | 'until_date';
  end_value?: number | string; // count or ISO date string
}

export interface RecurrenceConfig {
  recurrence_rrule: RecurrenceRule;
  recurrence_end_type: 'never' | 'after_n' | 'until_date';
  recurrence_end_value: string | null;
  next_run_at: string | null;
  is_recurrence_template: boolean;
}

const DAY_MAP: Record<string, number> = {
  sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6
};

const DAY_NAMES = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

/**
 * Calculate the next occurrence date from a given start date based on recurrence rule
 */
export function calculateNextOccurrence(
  rule: RecurrenceRule,
  fromDate: Date,
  occurrenceCount: number = 0
): Date | null {
  if (rule.type === 'none') return null;

  // Check end conditions
  if (rule.end_condition === 'after_n' && typeof rule.end_value === 'number') {
    if (occurrenceCount >= rule.end_value) return null;
  }
  if (rule.end_condition === 'until_date' && typeof rule.end_value === 'string') {
    const endDate = parseISO(rule.end_value);
    if (isAfter(fromDate, endDate)) return null;
  }

  const startOfFromDate = startOfDay(fromDate);
  let nextDate: Date;

  switch (rule.type) {
    case 'daily':
      nextDate = addDays(startOfFromDate, rule.interval);
      break;

    case 'weekly':
      if (rule.days_of_week && rule.days_of_week.length > 0) {
        nextDate = findNextWeekday(startOfFromDate, rule.days_of_week, rule.interval);
      } else {
        nextDate = addWeeks(startOfFromDate, rule.interval);
      }
      break;

    case 'monthly':
      nextDate = addMonths(startOfFromDate, rule.interval);
      if (rule.day_of_month) {
        // Set to specific day of month, clamped to valid days
        const maxDay = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
        const targetDay = Math.min(rule.day_of_month, maxDay);
        nextDate = new Date(nextDate.getFullYear(), nextDate.getMonth(), targetDay);
      }
      break;

    case 'custom':
      // Custom uses days_of_week if provided, otherwise daily
      if (rule.days_of_week && rule.days_of_week.length > 0) {
        nextDate = findNextWeekday(startOfFromDate, rule.days_of_week, 1);
      } else {
        nextDate = addDays(startOfFromDate, rule.interval);
      }
      break;

    default:
      return null;
  }

  // Final end date check
  if (rule.end_condition === 'until_date' && typeof rule.end_value === 'string') {
    const endDate = parseISO(rule.end_value);
    if (isAfter(nextDate, endDate)) return null;
  }

  return nextDate;
}

/**
 * Find the next weekday from a list of allowed days
 */
function findNextWeekday(fromDate: Date, daysOfWeek: string[], weekInterval: number): Date {
  const currentDayIndex = fromDate.getDay();
  const targetDays = daysOfWeek.map(d => DAY_MAP[d.toLowerCase()]).sort((a, b) => a - b);
  
  // Find next day in current week
  for (const targetDay of targetDays) {
    if (targetDay > currentDayIndex) {
      return addDays(fromDate, targetDay - currentDayIndex);
    }
  }
  
  // Move to next week(s) and get first target day
  const daysUntilNextWeek = 7 - currentDayIndex + targetDays[0];
  const additionalWeeks = (weekInterval - 1) * 7;
  return addDays(fromDate, daysUntilNextWeek + additionalWeeks);
}

/**
 * Calculate the first occurrence date for a new template
 */
export function calculateFirstOccurrence(
  rule: RecurrenceRule,
  startDate: Date = new Date()
): Date | null {
  if (rule.type === 'none') return null;

  const today = startOfDay(startDate);

  if (rule.type === 'weekly' && rule.days_of_week && rule.days_of_week.length > 0) {
    const currentDayIndex = today.getDay();
    const targetDays = rule.days_of_week.map(d => DAY_MAP[d.toLowerCase()]).sort((a, b) => a - b);
    
    // Check if today is a valid day
    if (targetDays.includes(currentDayIndex)) {
      return today;
    }
    
    // Find next valid day this week or next
    for (const targetDay of targetDays) {
      if (targetDay > currentDayIndex) {
        return addDays(today, targetDay - currentDayIndex);
      }
    }
    
    // Next week
    return addDays(today, 7 - currentDayIndex + targetDays[0]);
  }

  if (rule.type === 'monthly' && rule.day_of_month) {
    const currentDay = today.getDate();
    if (currentDay <= rule.day_of_month) {
      // This month
      const maxDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      const targetDay = Math.min(rule.day_of_month, maxDay);
      return new Date(today.getFullYear(), today.getMonth(), targetDay);
    } else {
      // Next month
      const nextMonth = addMonths(today, 1);
      const maxDay = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0).getDate();
      const targetDay = Math.min(rule.day_of_month, maxDay);
      return new Date(nextMonth.getFullYear(), nextMonth.getMonth(), targetDay);
    }
  }

  // Daily or simple weekly - start today or tomorrow
  return today;
}

/**
 * Generate a human-readable label for the recurrence pattern
 */
export function getRecurrenceLabelNew(rule: RecurrenceRule): string {
  if (!rule || rule.type === 'none') return '';

  const intervalText = rule.interval > 1 ? `every ${rule.interval} ` : 'every ';

  switch (rule.type) {
    case 'daily':
      return rule.interval === 1 ? 'Daily' : `Every ${rule.interval} days`;

    case 'weekly':
      if (rule.days_of_week && rule.days_of_week.length > 0) {
        const dayLabels = rule.days_of_week.map(d => d.charAt(0).toUpperCase() + d.slice(1, 3));
        if (rule.interval === 1) {
          return `Every ${dayLabels.join(', ')}`;
        }
        return `Every ${rule.interval} weeks on ${dayLabels.join(', ')}`;
      }
      return rule.interval === 1 ? 'Weekly' : `Every ${rule.interval} weeks`;

    case 'monthly':
      const dayText = rule.day_of_month ? ` on day ${rule.day_of_month}` : '';
      return rule.interval === 1 ? `Monthly${dayText}` : `Every ${rule.interval} months${dayText}`;

    case 'custom':
      if (rule.days_of_week && rule.days_of_week.length > 0) {
        const dayLabels = rule.days_of_week.map(d => d.charAt(0).toUpperCase() + d.slice(1, 3));
        return `Custom: ${dayLabels.join(', ')}`;
      }
      return `Custom: every ${rule.interval} day(s)`;

    default:
      return '';
  }
}

/**
 * Parse legacy RRULE string to new RecurrenceRule format
 */
export function parseLegacyRrule(rrule: string | null): RecurrenceRule | null {
  if (!rrule) return null;

  try {
    // Check if it's already JSON
    if (rrule.startsWith('{')) {
      return JSON.parse(rrule) as RecurrenceRule;
    }

    // Parse legacy RRULE format like "FREQ=DAILY;INTERVAL=1" or "FREQ=WEEKLY;BYDAY=MO,WE,FR"
    const parts = rrule.split(';').reduce((acc, part) => {
      const [key, value] = part.split('=');
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);

    const freq = parts.FREQ?.toLowerCase();
    const interval = parseInt(parts.INTERVAL || '1', 10);
    const byDay = parts.BYDAY?.split(',').map(d => {
      const dayMap: Record<string, string> = { MO: 'mon', TU: 'tue', WE: 'wed', TH: 'thu', FR: 'fri', SA: 'sat', SU: 'sun' };
      return dayMap[d] || d.toLowerCase();
    });

    const rule: RecurrenceRule = {
      type: (freq as RecurrenceRule['type']) || 'none',
      interval,
      end_condition: 'never',
    };

    if (byDay && byDay.length > 0) {
      rule.days_of_week = byDay;
    }

    return rule;
  } catch {
    return null;
  }
}

/**
 * Convert RecurrenceRule to JSON string for storage
 */
export function serializeRecurrenceRule(rule: RecurrenceRule): string {
  return JSON.stringify(rule);
}

/**
 * Build recurrence config for creating a template task
 */
export function buildRecurrenceConfig(
  rule: RecurrenceRule,
  startDate: Date = new Date()
): RecurrenceConfig {
  const nextRun = calculateFirstOccurrence(rule, startDate);

  return {
    recurrence_rrule: rule,
    recurrence_end_type: rule.end_condition,
    recurrence_end_value: rule.end_value?.toString() || null,
    next_run_at: nextRun ? nextRun.toISOString() : null,
    is_recurrence_template: rule.type !== 'none',
  };
}

/**
 * Check if a recurrence has ended based on conditions
 */
export function isRecurrenceEnded(
  rule: RecurrenceRule,
  occurrenceCount: number,
  currentDate: Date = new Date()
): boolean {
  if (rule.end_condition === 'never') return false;

  if (rule.end_condition === 'after_n' && typeof rule.end_value === 'number') {
    return occurrenceCount >= rule.end_value;
  }

  if (rule.end_condition === 'until_date' && typeof rule.end_value === 'string') {
    const endDate = parseISO(rule.end_value);
    return isAfter(currentDate, endDate);
  }

  return false;
}
