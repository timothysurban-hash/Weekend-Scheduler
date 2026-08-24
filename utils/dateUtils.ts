// Independent Date Utilities for Congregation Scheduler
// Domain eligibility logic lives in ../domain/eligibilityPolicy.ts

export {
  getCandidateStatus,
  getDefaultQualificationsForStatus,
  isBrotherQualifiedForRole,
  isCandidateEligible
} from '../domain/eligibilityPolicy';

/**
 * Checks if a given date string (YYYY-MM-DD) is within the current calendar week (Monday to Sunday).
 */
export const isUpcomingSunday = (dateStr: string): boolean => {
  const parts = dateStr.split('-').map(Number);
  if (parts.length < 3) return false;
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  d.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dayOfWeek = today.getDay(); // 0 is Sun, 1 is Mon...
  const distanceToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const mon = new Date(today);
  mon.setDate(today.getDate() + distanceToMon);

  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);

  return d >= mon && d <= sun;
};

/**
 * Parses YYYY-MM-DD into 0-indexed month and full year object.
 */
export const getYearMonth = (dateStr: string): { year: number; month: number } => {
  const parts = dateStr.split('-');
  if (parts.length < 2) return { year: 0, month: 0 };
  return { year: parseInt(parts[0], 10), month: parseInt(parts[1], 10) - 1 };
};

/**
 * Formats a Date object into 'Month Year' string (e.g. "August 2026").
 */
export const formatViewMonth = (date: Date): string => {
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
};
