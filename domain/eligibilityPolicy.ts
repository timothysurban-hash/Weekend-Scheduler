import { DutyRole, Speaker, RoleDefinition, SpiritualStatus } from '../types';
import { DEFAULT_ROLES } from '../constants';

/**
 * Evaluates candidate spiritual status based on tags or spiritualStatus field.
 */
export const getCandidateStatus = (candidate: Speaker): SpiritualStatus => {
  if (candidate.spiritualStatus) return candidate.spiritualStatus;

  if (candidate.customTags && candidate.customTags.length > 0) {
    const isElder = candidate.customTags.some(t => t.trim().toLowerCase() === 'elder');
    if (isElder) return 'elder';
    const isMS = candidate.customTags.some(t => {
      const lower = t.trim().toLowerCase();
      return lower === 'ms' || lower.includes('ministerial');
    });
    if (isMS) return 'ms';
    const isUP = candidate.customTags.some(t => {
      const lower = t.trim().toLowerCase();
      return lower === 'up' || lower.includes('unbaptized');
    });
    if (isUP) return 'up';
  }
  return 'publisher';
};

/**
 * Returns default duty qualifications for a given spiritual status.
 */
export const getDefaultQualificationsForStatus = (status: SpiritualStatus): DutyRole[] => {
  switch (status) {
    case 'elder':
      return ['chairman', 'speaker', 'conductor', 'reader', 'attendant_entrance', 'attendant_auditorium', 'mic'];
    case 'ms':
      return ['chairman', 'speaker', 'reader', 'attendant_entrance', 'attendant_auditorium', 'mic'];
    case 'publisher':
      return ['attendant_entrance', 'attendant_auditorium', 'mic'];
    case 'up':
      return ['mic'];
    default:
      return ['mic'];
  }
};

/**
 * Evaluates whether a brother is qualified for a specific role based on spiritual status or custom role definitions.
 */
export const isBrotherQualifiedForRole = (
  candidate: Speaker,
  roleKey: DutyRole,
  rolesList: RoleDefinition[] = DEFAULT_ROLES
): boolean => {
  const candidateStatus = getCandidateStatus(candidate);

  // Unbaptized Publishers can only handle Microphone
  if (candidateStatus === 'up') {
    return roleKey === 'mic';
  }

  // Find role definition or fall back to default rule
  const roleDef = rolesList.find(r => r.key === roleKey);
  const minStatus = roleDef?.minSpiritualStatus || (
    roleKey === 'chairman' || roleKey === 'conductor' || roleKey === 'reader' ? 'ms' : 'publisher'
  );

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
 * 2. Is candidate in active roster (if roster is specified)?
 * 3. Is candidate available on target date (not blacklisted)?
 * 4. Is candidate free from other duty assignments on target date?
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

  // Roster check: if rosterIds is passed, candidate must be activated in rosterIds
  if (rosterIds !== undefined) {
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
