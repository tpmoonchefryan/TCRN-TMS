// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

/**
 * Format date to ISO string (yyyy-MM-dd)
 */
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Format date to ISO datetime string
 */
export function formatDateTime(date: Date): string {
  return date.toISOString();
}

/**
 * Parse ISO date string to Date object
 */
export function parseDate(dateString: string): Date {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date string: ${dateString}`);
  }
  return date;
}

/**
 * Check if a date is expired
 */
export function isExpired(date: Date, now = new Date()): boolean {
  return date.getTime() < now.getTime();
}

/**
 * Add days to a date
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Add minutes to a date
 */
export function addMinutes(date: Date, minutes: number): Date {
  const result = new Date(date);
  result.setMinutes(result.getMinutes() + minutes);
  return result;
}

/**
 * Get the difference between two dates in days
 */
export function diffInDays(date1: Date, date2: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((date1.getTime() - date2.getTime()) / msPerDay);
}

/**
 * Check if a date is within a range
 */
export function isWithinRange(date: Date, start: Date, end: Date): boolean {
  const timestamp = date.getTime();
  return timestamp >= start.getTime() && timestamp <= end.getTime();
}
