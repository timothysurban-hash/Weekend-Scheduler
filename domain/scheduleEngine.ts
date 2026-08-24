import { Assignment, Speaker, AppSettings, DutyRole } from '../types';
import { getYearMonth } from '../utils/dateUtils';
import { isCandidateEligible } from './eligibilityPolicy';

export interface AutoRotateResult {
  updatedAssignments: Assignment[];
  newlyFilledIds: string[];
}

export interface ApplyAuthorityRolesResult {
  updatedAssignments: Assignment[];
  appliedCount: number;
}

export interface ClearMonthResult {
  updatedAssignments: Assignment[];
  clearedCount: number;
}

/**
 * Generates unique alphanumeric ID.
 */
const generateId = (): string => Math.random().toString(36).substring(2, 11);

/**
 * Ensures all Sundays for the specified month and year exist in the assignments list.
 */
export const ensureMonthSundays = (
  assignments: Assignment[],
  year: number,
  month: number
): Assignment[] => {
  const currentAssignments = Array.isArray(assignments) ? [...assignments] : [];
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
    if (d.getDay() === 0) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${day}`;
      if (!currentAssignments.some(a => a.date === dateStr)) {
        currentAssignments.push({
          id: generateId(),
          date: dateStr,
          speakerId: null,
          outlineId: null,
          locked: false
        });
      }
    }
  }

  return currentAssignments.sort((a, b) => a.date.localeCompare(b.date));
};

/**
 * Finds the most recent date a brother served in a specific role prior to beforeDate.
 */
export const getLastRoleDate = (
  assignments: Assignment[],
  brotherId: string,
  role: DutyRole,
  beforeDate: string
): string => {
  let maxDate = '';
  for (const a of assignments) {
    if (a.date >= beforeDate) continue;

    let servedInRole = false;
    if (role === 'chairman' && a.chairmanId === brotherId) servedInRole = true;
    else if (role === 'speaker' && a.speakerId === brotherId) servedInRole = true;
    else if (role === 'conductor' && a.conductorId === brotherId) servedInRole = true;
    else if (role === 'reader' && a.readerId === brotherId) servedInRole = true;
    else if (role === 'attendant_entrance' && a.entranceAttendantId === brotherId) servedInRole = true;
    else if (role === 'attendant_auditorium' && a.auditoriumAttendantId === brotherId) servedInRole = true;
    else if (role === 'mic' && a.micServerIds?.includes(brotherId)) servedInRole = true;

    if (servedInRole && a.date > maxDate) {
      maxDate = a.date;
    }
  }
  return maxDate;
};

/**
 * Auto-rotates duties for all unlocked meetings in the specified month.
 */
export const autoRotateMonth = (
  assignments: Assignment[],
  speakers: Speaker[],
  settings: AppSettings,
  year: number,
  month: number
): AutoRotateResult => {
  const localBrothers = speakers.filter(s => !s.isGuest);
  if (localBrothers.length === 0) {
    return { updatedAssignments: assignments, newlyFilledIds: [] };
  }

  // 1. Ensure all Sundays in the month are present
  const workingAssignments = ensureMonthSundays(assignments, year, month);
  const newlyFilledIds: string[] = [];

  const getQualifiedBrothers = (role: DutyRole): Speaker[] => {
    const rule = settings.roleRules?.[role];
    if (rule && rule.rosterIds && rule.rosterIds.length > 0) {
      return localBrothers.filter(s => rule.rosterIds.includes(s.id));
    }
    // Fall back to brothers qualified for this role
    return localBrothers.filter(s => isCandidateEligible(s, role, '', new Set()));
  };

  // Track round-robin offset per role
  const roleOffsetMap: Record<string, number> = {};

  const pickNextBrother = (
    role: DutyRole,
    dateStr: string,
    assignedInMeeting: Set<string>
  ): string | null => {
    const candidates = getQualifiedBrothers(role);
    if (candidates.length === 0) return null;

    const currentOffset = roleOffsetMap[role] || 0;

    // Sort candidates by last assignment date for this role (ascending: oldest / never assigned first)
    const sortedCandidates = [...candidates].sort((a, b) => {
      const lastA = getLastRoleDate(workingAssignments, a.id, role, dateStr);
      const lastB = getLastRoleDate(workingAssignments, b.id, role, dateStr);

      if (!lastA && !lastB) {
        const indexA = (candidates.indexOf(a) + currentOffset) % candidates.length;
        const indexB = (candidates.indexOf(b) + currentOffset) % candidates.length;
        return indexA - indexB;
      }
      if (!lastA) return -1;
      if (!lastB) return 1;
      return lastA.localeCompare(lastB);
    });

    const rule = settings.roleRules?.[role];
    const roster = rule?.rosterIds;

    for (const candidate of sortedCandidates) {
      if (isCandidateEligible(candidate, role, dateStr, assignedInMeeting, roster)) {
        assignedInMeeting.add(candidate.id);
        roleOffsetMap[role] = (currentOffset + 1) % candidates.length;
        return candidate.id;
      }
    }
    return null;
  };

  for (let i = 0; i < workingAssignments.length; i++) {
    const a = workingAssignments[i];
    const { year: aYear, month: aMonth } = getYearMonth(a.date);

    if (aYear === year && aMonth === month && !a.locked && !a.isSpecialEvent) {
      const assignedInMeeting = new Set<string>();

      // Preserve Public Speaker if set
      if (a.speakerId) assignedInMeeting.add(a.speakerId);

      const updatedCard = { ...a };

      // 1. Presiding & Meeting Conductors
      updatedCard.chairmanId = pickNextBrother('chairman', a.date, assignedInMeeting);

      if (settings.authorityRoles?.conductorId) {
        updatedCard.conductorId = settings.authorityRoles.conductorId;
        assignedInMeeting.add(settings.authorityRoles.conductorId);
      } else {
        updatedCard.conductorId = pickNextBrother('conductor', a.date, assignedInMeeting);
      }

      updatedCard.readerId = pickNextBrother('reader', a.date, assignedInMeeting);

      // 2. Attendants & Support Roles
      updatedCard.entranceAttendantId = pickNextBrother('attendant_entrance', a.date, assignedInMeeting);

      if (settings.authorityRoles?.auditoriumAttendantId) {
        updatedCard.auditoriumAttendantId = settings.authorityRoles.auditoriumAttendantId;
        assignedInMeeting.add(settings.authorityRoles.auditoriumAttendantId);
      } else {
        updatedCard.auditoriumAttendantId = pickNextBrother('attendant_auditorium', a.date, assignedInMeeting);
      }

      const mic1 = pickNextBrother('mic', a.date, assignedInMeeting);
      const mic2 = pickNextBrother('mic', a.date, assignedInMeeting);
      updatedCard.micServerIds = [mic1, mic2].filter((id): id is string => Boolean(id));

      workingAssignments[i] = updatedCard;
      newlyFilledIds.push(a.id);
    }
  }

  return {
    updatedAssignments: workingAssignments,
    newlyFilledIds
  };
};

/**
 * Applies static authority roles across all unlocked meetings in the specified month.
 */
export const applyAuthorityRoles = (
  assignments: Assignment[],
  settings: AppSettings,
  year: number,
  month: number
): ApplyAuthorityRolesResult => {
  const conductorId = settings.authorityRoles?.conductorId;
  const auditoriumAttendantId = settings.authorityRoles?.auditoriumAttendantId;

  if (!conductorId && !auditoriumAttendantId) {
    return { updatedAssignments: assignments, appliedCount: 0 };
  }

  let appliedCount = 0;
  const updatedAssignments = assignments.map(a => {
    const { year: aYear, month: aMonth } = getYearMonth(a.date);
    if (aYear === year && aMonth === month && !a.locked && !a.isSpecialEvent) {
      const updated = { ...a };
      if (conductorId) {
        updated.conductorId = conductorId;
        appliedCount++;
      }
      if (auditoriumAttendantId) {
        updated.auditoriumAttendantId = auditoriumAttendantId;
        appliedCount++;
      }
      return updated;
    }
    return a;
  });

  return {
    updatedAssignments,
    appliedCount
  };
};

/**
 * Clears duties for all unlocked meetings in the specified month.
 */
export const clearMonthAssignments = (
  assignments: Assignment[],
  year: number,
  month: number
): ClearMonthResult => {
  let clearedCount = 0;
  const updatedAssignments = assignments.map(a => {
    const { year: aYear, month: aMonth } = getYearMonth(a.date);
    if (aYear === year && aMonth === month && !a.locked) {
      clearedCount++;
      return {
        ...a,
        speakerId: null,
        outlineId: null,
        chairmanId: null,
        conductorId: null,
        readerId: null,
        entranceAttendantId: null,
        auditoriumAttendantId: null,
        micServerIds: [],
        customDutyAssignments: {},
        customTalkTitle: '',
        note: ''
      };
    }
    return a;
  });

  return {
    updatedAssignments,
    clearedCount
  };
};
