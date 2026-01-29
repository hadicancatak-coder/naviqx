/**
 * Working Days Helper Functions
 * Utilities for validating dates against user working days
 */

export interface WorkingDaysValidation {
  isValid: boolean;
  invalidUsers: Array<{ name: string; workingDays: string }>;
}

/**
 * Check if a specific date is a working day for a user based on their working_days setting
 */
export function isDateWorkingDay(date: Date, workingDays: string | null): boolean {
  if (!workingDays) return true; // No restriction if working_days not set
  
  const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
  
  if (workingDays === 'mon-fri') {
    return dayOfWeek >= 1 && dayOfWeek <= 5;
  } else if (workingDays === 'sun-thu') {
    return dayOfWeek === 0 || (dayOfWeek >= 1 && dayOfWeek <= 4);
  }
  
  return true;
}

/**
 * Validate a date against multiple users' working days
 */
export function validateDateForUsers(
  date: Date | undefined,
  users: Array<{ name: string; working_days?: string | null }>
): WorkingDaysValidation {
  if (!date) {
    return { isValid: true, invalidUsers: [] };
  }
  
  const invalidUsers = users.filter(user => 
    !isDateWorkingDay(date, user.working_days)
  ).map(user => ({
    name: user.name,
    workingDays: user.working_days || 'not set'
  }));
  
  return {
    isValid: invalidUsers.length === 0,
    invalidUsers
  };
}

/**
 * Get human-readable day name
 */
export function getDayName(date: Date): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.getDay()];
}

/**
 * Format working days for display
 */
export function formatWorkingDays(workingDays: string | null): string {
  if (!workingDays) return 'Not set';
  if (workingDays === 'mon-fri') return 'Mon-Fri';
  if (workingDays === 'sun-thu') return 'Sun-Thu';
  return workingDays;
}
