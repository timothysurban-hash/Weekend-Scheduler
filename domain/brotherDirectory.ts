import { Speaker, Assignment, DutyRole, SpiritualStatus } from '../types';
import { getCandidateStatus, isBrotherQualifiedForRole, getDefaultQualificationsForStatus } from './eligibilityPolicy';

export type BrotherSortOption = 'rotation' | 'name_asc' | 'name_desc' | 'status' | 'last_assigned';

export interface BrotherFilterCriteria {
  searchQuery?: string;
  statusFilter?: 'all' | SpiritualStatus;
  roleFilter?: string;
  includeGuests?: boolean;
}

export interface BrotherAssignmentHistory {
  date: string;
  isHost: boolean;
}

export interface NewBrotherInput {
  name: string;
  congregation?: string;
  isGuest?: boolean;
  spiritualStatus?: SpiritualStatus;
  qualifications?: DutyRole[];
}

const statusRank: Record<SpiritualStatus, number> = {
  elder: 1,
  ms: 2,
  publisher: 3,
  up: 4
};

/**
 * Checks if a brother is available on a specific date (not in blackout dates).
 */
export const isBrotherAvailableForDate = (brother: Speaker, dateStr: string): boolean => {
  return !brother.unavailableDates || !brother.unavailableDates.includes(dateStr);
};

/**
 * Calculates the effective last date a brother served in an assignment or hosted a guest speaker.
 */
export const getBrotherLastAssignment = (
  brother: Speaker,
  assignments: Assignment[] = []
): BrotherAssignmentHistory | null => {
  let maxDate = brother.lastAssigned || '';
  let isHost = false;

  for (const a of assignments) {
    const isAssigned =
      a.speakerId === brother.id ||
      a.chairmanId === brother.id ||
      a.conductorId === brother.id ||
      a.readerId === brother.id ||
      a.entranceAttendantId === brother.id ||
      a.auditoriumAttendantId === brother.id ||
      a.micServerIds?.includes(brother.id);

    if (isAssigned && a.date > maxDate) {
      maxDate = a.date;
      isHost = false;
    }

    if (a.hostSpeakerId === brother.id && a.date > maxDate) {
      maxDate = a.date;
      isHost = true;
    }
  }

  return maxDate ? { date: maxDate, isHost } : null;
};

/**
 * Filters brothers based on search query, spiritual status, qualified role, and guest status.
 */
export const filterBrothers = (
  brothers: Speaker[],
  criteria: BrotherFilterCriteria = {}
): Speaker[] => {
  const { searchQuery = '', statusFilter = 'all', roleFilter = 'all', includeGuests = false } = criteria;
  const normalizedQuery = searchQuery.trim().toLowerCase();

  return brothers.filter(b => {
    if (!includeGuests && b.isGuest) return false;

    // 1. Search Query Filter (name or congregation)
    if (normalizedQuery) {
      const nameMatch = b.name.toLowerCase().includes(normalizedQuery);
      const congMatch = (b.congregation || '').toLowerCase().includes(normalizedQuery);
      if (!nameMatch && !congMatch) return false;
    }

    // 2. Spiritual Status Filter
    if (statusFilter !== 'all') {
      const status = getCandidateStatus(b);
      if (status !== statusFilter) return false;
    }

    // 3. Qualified Role Filter
    if (roleFilter !== 'all') {
      if (!isBrotherQualifiedForRole(b, roleFilter as DutyRole)) return false;
    }

    return true;
  });
};

/**
 * Sorts brothers according to the chosen sorting strategy.
 */
export const sortBrothers = (
  brothers: Speaker[],
  sortBy: BrotherSortOption = 'rotation',
  assignments: Assignment[] = []
): Speaker[] => {
  return [...brothers].sort((a, b) => {
    if (sortBy === 'name_asc') {
      return a.name.localeCompare(b.name);
    }
    if (sortBy === 'name_desc') {
      return b.name.localeCompare(a.name);
    }
    if (sortBy === 'status') {
      const rankA = statusRank[getCandidateStatus(a)] || 99;
      const rankB = statusRank[getCandidateStatus(b)] || 99;
      if (rankA !== rankB) return rankA - rankB;
      return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
    }
    if (sortBy === 'last_assigned') {
      const lastA = getBrotherLastAssignment(a, assignments)?.date || '';
      const lastB = getBrotherLastAssignment(b, assignments)?.date || '';
      if (!lastA && !lastB) return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
      if (!lastA) return -1;
      if (!lastB) return 1;
      return lastA.localeCompare(lastB);
    }
    // Default: manual rotation sortOrder
    return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
  });
};

/**
 * Creates a new normalized brother record with auto-incremented sort order and default qualifications.
 */
export const createBrotherRecord = (
  input: NewBrotherInput,
  existingBrothers: Speaker[] = [],
  defaultCongregation: string = 'Central'
): Speaker => {
  const maxSort = existingBrothers.reduce(
    (max, s) => ((s.sortOrder ?? 0) > max ? (s.sortOrder ?? 0) : max),
    0
  );

  const spiritualStatus = input.spiritualStatus || 'publisher';
  const qualifications = input.qualifications || getDefaultQualificationsForStatus(spiritualStatus);

  return {
    id: Math.random().toString(36).substring(2, 11),
    name: input.name.trim(),
    congregation: input.congregation?.trim() || defaultCongregation,
    isGuest: Boolean(input.isGuest),
    unavailableDates: [],
    lastAssigned: null,
    sortOrder: maxSort + 1,
    spiritualStatus,
    qualifications
  };
};
