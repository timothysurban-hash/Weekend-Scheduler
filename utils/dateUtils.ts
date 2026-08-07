// Independent Date & Scheduling Utilities for Congregation Scheduler

import { DutyRole, Speaker, RoleDefinition } from '../types';
import { DEFAULT_ROLES } from '../constants';

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

/**
 * Evaluates candidate spiritual status based on tags or spiritualStatus field.
 */
export const getCandidateStatus = (candidate: Speaker): 'elder' | 'ms' | 'publisher' => {
  if (candidate.spiritualStatus) return candidate.spiritualStatus;

  if (candidate.customTags && candidate.customTags.length > 0) {
    const isElder = candidate.customTags.some(t => t.trim().toLowerCase() === 'elder');
    if (isElder) return 'elder';
    const isMS = candidate.customTags.some(t => {
      const lower = t.trim().toLowerCase();
      return lower === 'ms' || lower.includes('ministerial');
    });
    if (isMS) return 'ms';
  }
  return 'publisher';
};

/**
 * Evaluates whether a brother is qualified for a specific role.
 */
export const isBrotherQualifiedForRole = (
  candidate: Speaker,
  roleKey: DutyRole,
  rolesList: RoleDefinition[] = DEFAULT_ROLES
): boolean => {
  // Check explicit qualifications list if populated
  const hasRoleQual = candidate.qualifications && candidate.qualifications.length > 0
    ? candidate.qualifications.includes(roleKey)
    : true;

  if (!hasRoleQual) return false;

  // Find role definition or fall back to default rule
  const roleDef = rolesList.find(r => r.key === roleKey);
  const minStatus = roleDef?.minSpiritualStatus || (
    roleKey === 'chairman' || roleKey === 'conductor' || roleKey === 'reader' ? 'ms' : 'publisher'
  );

  const candidateStatus = getCandidateStatus(candidate);

  if (minStatus === 'elder') {
    return candidateStatus === 'elder';
  } else if (minStatus === 'ms') {
    return candidateStatus === 'elder' || candidateStatus === 'ms';
  }

  return true;
};

/**
 * Evaluates candidate eligibility in order:
 * 1. Is candidate qualified for this role?
 * 2. Is candidate available on target date (not blacklisted)?
 * 3. Is candidate free from other duty assignments on target date?
 */
export const isCandidateEligible = (
  candidate: Speaker,
  roleKey: DutyRole,
  dateStr: string,
  assignedInMeeting: Set<string>,
  rosterIds?: string[],
  rolesList: RoleDefinition[] = DEFAULT_ROLES
): boolean => {
  // Qualification check
  if (!isBrotherQualifiedForRole(candidate, roleKey, rolesList)) {
    return false;
  }

  // Roster check
  if (rosterIds && rosterIds.length > 0) {
    if (!rosterIds.includes(candidate.id)) return false;
  }

  // Blackout / Unavailability check
  if (candidate.unavailableDates && candidate.unavailableDates.includes(dateStr)) {
    return false;
  }

  // Multi-role collision check
  if (assignedInMeeting.has(candidate.id)) {
    return false;
  }

  return true;
};
