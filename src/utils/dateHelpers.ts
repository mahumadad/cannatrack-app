/**
 * Convert a Date to a local YYYY-MM-DD string (avoids UTC shift from toISOString).
 * Use this instead of `date.toISOString().split('T')[0]` to prevent
 * timezone issues where late-night local times get shifted to the next day in UTC.
 */
export const toLocalDateString = (date: Date = new Date()): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/** Pad a number with a leading zero (e.g. 5 → "05"). */
export const padZero = (num: number): string => String(num).padStart(2, '0');
