import { useCallback } from 'react';
import { Assignment, Speaker, Outline, AppSettings, DutyRole } from '../types';
import { autoRotateMonth, applyAuthorityRoles, clearMonthAssignments } from './scheduleEngine';
import { isBrotherAvailableForDate } from './brotherDirectory';
import { isBrotherQualifiedForRole } from './eligibilityPolicy';

/**
 * Ensures all Sundays for a given year and month index (0-11) exist as assignments.
 * Preserves existing assignment rows and fills missing dates.
 */
export function ensureMonthSchedule(
  currentAssignments: Assignment[],
  year: number,
  monthIndex: number
): Assignment[] {
  const assignments = Array.isArray(currentAssignments) ? [...currentAssignments] : [];
  const existingMap = new Map<string, Assignment>(assignments.map(a => [a.date, a]));

  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const monthSundays: Assignment[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, monthIndex, day);
    if (d.getDay() === 0) { // Sunday
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dayStr = String(d.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${dayStr}`;

      if (existingMap.has(dateStr)) {
        monthSundays.push(existingMap.get(dateStr)!);
      } else {
        const newAssignment: Assignment = {
          id: `manual_${dateStr}_${Math.random().toString(36).substr(2, 5)}`,
          date: dateStr,
          speakerId: null,
          outlineId: null,
          locked: false,
          speakerLocked: false
        };
        monthSundays.push(newAssignment);
        existingMap.set(dateStr, newAssignment);
      }
    }
  }

  // Combine other month assignments + current month sundays
  const otherAssignments = assignments.filter(a => {
    const [aY, aM] = a.date.split('-').map(Number);
    return !(aY === year && (aM - 1) === monthIndex);
  });

  return [...otherAssignments, ...monthSundays].sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Assigns a duty role to a brother for a specific assignment ID.
 * Supports single-brother roles and indexed mic roles ('mic_1', 'mic_2').
 */
export function assignDuty(
  assignments: Assignment[],
  assignmentId: string,
  role: string,
  brotherId: string | null
): Assignment[] {
  return assignments.map(a => {
    if (a.id !== assignmentId || a.locked) return a;

    if (role === 'chairman') return { ...a, chairmanId: brotherId };
    if (role === 'conductor') return { ...a, conductorId: brotherId };
    if (role === 'reader') return { ...a, readerId: brotherId };
    if (role === 'entrance' || role === 'attendant_entrance') return { ...a, entranceAttendantId: brotherId };
    if (role === 'auditorium' || role === 'attendant_auditorium') return { ...a, auditoriumAttendantId: brotherId };

    if (role === 'mic_1' || role === 'mic1') {
      const currentSecond = a.micServerIds?.[1] || null;
      const newMics = brotherId
        ? [brotherId, ...(currentSecond ? [currentSecond] : [])]
        : (currentSecond ? [currentSecond] : []);
      return { ...a, micServerIds: newMics };
    }

    if (role === 'mic_2' || role === 'mic2') {
      const currentFirst = a.micServerIds?.[0] || null;
      const newMics = currentFirst
        ? [currentFirst, ...(brotherId ? [brotherId] : [])]
        : (brotherId ? [brotherId] : []);
      return { ...a, micServerIds: newMics };
    }

    return a;
  });
}

/**
 * Assigns speaker, talk outline, or custom talk title with mutual exclusivity rules.
 */
export function assignSpeakerAndOutline(
  assignments: Assignment[],
  assignmentId: string,
  options: {
    speakerId?: string | null;
    outlineId?: number | null;
    customTalkTitle?: string;
    hostSpeakerId?: string | null;
  }
): Assignment[] {
  return assignments.map(a => {
    if (a.id !== assignmentId) return a;

    const updated = { ...a };

    if ('speakerId' in options) {
      if (a.locked || a.speakerLocked) return a;
      updated.speakerId = options.speakerId || null;
      updated.outlineId = null;
      updated.hostSpeakerId = options.hostSpeakerId || null;
    }

    if ('outlineId' in options) {
      if (a.locked) return a;
      const outId = options.outlineId;
      if (outId && outId > 0) {
        updated.outlineId = outId;
        updated.customTalkTitle = '';
      } else {
        updated.outlineId = null;
      }
    }

    if ('customTalkTitle' in options) {
      if (a.locked) return a;
      const title = options.customTalkTitle || '';
      updated.customTalkTitle = title;
      if (title.trim()) {
        updated.outlineId = null;
      }
    }

    return updated;
  });
}

/**
 * Creates and registers a guest speaker record and assigns them to the meeting date.
 */
export function addGuestSpeaker(
  currentAssignments: Assignment[],
  currentSpeakers: Speaker[],
  input: {
    assignmentId: string;
    name: string;
    congregation: string;
    hostId?: string;
    outlineId?: number;
    customTalkTitle?: string;
  }
): { assignments: Assignment[]; speakers: Speaker[]; guestSpeaker: Speaker } {
  const guestId = Math.random().toString(36).substr(2, 9);
  const guestSpeaker: Speaker = {
    id: guestId,
    name: input.name.trim(),
    congregation: input.congregation?.trim() || 'Visiting',
    isGuest: true,
    unavailableDates: [],
    lastAssigned: null,
    sortOrder: 9999,
    spiritualStatus: 'publisher',
    qualifications: ['speaker']
  };

  const updatedSpeakers = [...currentSpeakers, guestSpeaker];

  const updatedAssignments = currentAssignments.map(a => {
    if (a.id !== input.assignmentId) return a;
    return {
      ...a,
      speakerId: guestId,
      outlineId: input.outlineId || null,
      customTalkTitle: input.customTalkTitle || undefined,
      locked: false,
      hostSpeakerId: input.hostId || null
    };
  });

  return {
    assignments: updatedAssignments,
    speakers: updatedSpeakers,
    guestSpeaker
  };
}

/**
 * Toggles the lock status of a meeting row or the speaker role specifically.
 */
export function toggleLock(
  assignments: Assignment[],
  assignmentId: string,
  lockType: 'row' | 'speaker'
): Assignment[] {
  return assignments.map(a => {
    if (a.id !== assignmentId) return a;
    if (lockType === 'row') {
      return { ...a, locked: !a.locked };
    }
    if (lockType === 'speaker') {
      return { ...a, speakerLocked: !a.speakerLocked };
    }
    return a;
  });
}

/**
 * Scans a single meeting assignment for multi-role collision errors.
 * Ignores Auditorium Attendant role which is allowed to be double-booked.
 */
export function detectAssignmentConflicts(
  assignment: Assignment,
  speakers: Speaker[]
): string[] {
  if (assignment.isSpecialEvent && (assignment.noMeeting ?? true)) {
    return [];
  }
  const assigned: { roleName: string; id: string; isAuditorium: boolean }[] = [];

  if (assignment.chairmanId) assigned.push({ roleName: 'Chairman', id: assignment.chairmanId, isAuditorium: false });
  if (assignment.conductorId) assigned.push({ roleName: 'WT Conductor', id: assignment.conductorId, isAuditorium: false });
  if (assignment.readerId) assigned.push({ roleName: 'WT Reader', id: assignment.readerId, isAuditorium: false });
  if (assignment.speakerId) assigned.push({ roleName: 'Public Speaker', id: assignment.speakerId, isAuditorium: false });
  if (assignment.entranceAttendantId) assigned.push({ roleName: 'Entrance Attendant', id: assignment.entranceAttendantId, isAuditorium: false });
  if (assignment.auditoriumAttendantId) assigned.push({ roleName: 'Auditorium Attendant', id: assignment.auditoriumAttendantId, isAuditorium: true });

  if (assignment.micServerIds && assignment.micServerIds.length > 0) {
    assignment.micServerIds.forEach((mId, idx) => {
      if (mId) assigned.push({ roleName: `Mic ${idx + 1}`, id: mId, isAuditorium: false });
    });
  }

  const counts: Record<string, { roleName: string; isAuditorium: boolean }[]> = {};
  assigned.forEach(item => {
    if (!counts[item.id]) counts[item.id] = [];
    counts[item.id].push(item);
  });

  const conflictList: string[] = [];
  Object.entries(counts).forEach(([id, items]) => {
    const nonAuditoriumRoles = items.filter(it => !it.isAuditorium);
    if (nonAuditoriumRoles.length > 1) {
      const brotherName = speakers.find(s => s.id === id)?.name || 'Brother';
      conflictList.push(`${brotherName} (${nonAuditoriumRoles.map(r => r.roleName).join(' & ')})`);
    }
  });

  return conflictList;
}

/**
 * Returns filtered and scored brother candidate options for a specific duty role on a date.
 */
export function getCandidateBrothers(
  speakers: Speaker[],
  assignments: Assignment[],
  dateStr: string,
  role: DutyRole,
  currentSelectedId?: string | null
): Array<{
  value: string;
  label: string;
  subLabel: string;
  statusLabel: string;
  status: 'success' | 'warning' | 'danger' | 'neutral';
}> {
  const eligibleBrothers = speakers.filter(s => !s.isGuest || s.id === currentSelectedId || role === 'speaker');

  const candidates = eligibleBrothers
    .filter(s => {
      if (s.id === currentSelectedId) return true;
      if (s.isGuest && role === 'speaker') return true;
      if (s.qualifications && s.qualifications.length > 0) {
        return s.qualifications.includes(role);
      }
      return isBrotherQualifiedForRole(s, role);
    })
    .map(s => {
      const isBlackout = !isBrotherAvailableForDate(s, dateStr);

      let status: 'success' | 'warning' | 'danger' | 'neutral' = 'neutral';
      let statusLabel = '';

      if (isBlackout) {
        status = 'danger';
        statusLabel = 'Unavailable';
      } else {
        const lastDate = assignments
          .filter(a => (
            a.chairmanId === s.id ||
            a.conductorId === s.id ||
            a.readerId === s.id ||
            a.speakerId === s.id ||
            a.entranceAttendantId === s.id ||
            a.auditoriumAttendantId === s.id ||
            (a.micServerIds && a.micServerIds.includes(s.id))
          ) && a.date < dateStr)
          .map(a => a.date)
          .sort()
          .pop();

        if (lastDate) {
          const diffDays = Math.floor((new Date(dateStr).getTime() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24));
          statusLabel = `${diffDays}d ago`;
          status = diffDays >= 21 ? 'success' : diffDays >= 14 ? 'neutral' : 'warning';
        } else {
          statusLabel = 'Available';
          status = 'success';
        }
      }

      return {
        value: s.id,
        label: s.name,
        subLabel: s.isGuest ? `Guest • ${s.congregation}` : s.congregation,
        statusLabel,
        status
      };
    });

  candidates.unshift({ value: '', label: 'Select...', subLabel: '', statusLabel: '', status: 'neutral' });
  return candidates;
}

/**
 * Calculates effective last used dates and cooldown statuses for all outlines.
 */
export function getOutlineOptions(
  outlines: Outline[],
  assignments: Assignment[],
  targetDateStr: string,
  currentAssignmentId?: string,
  cooldownMonths: number = 6
): Array<{
  value: number;
  label: string;
  subLabel?: string;
  status: 'success' | 'warning' | 'danger' | 'neutral';
  statusLabel: string;
}> {
  const getEffectiveLastUsed = (outline: Outline): string | null => {
    const dates = [outline.lastUsed].filter(Boolean) as string[];
    const scheduledDates = assignments
      .filter(a => a.outlineId === outline.id && a.id !== currentAssignmentId)
      .map(a => a.date);

    const allDates = [...dates, ...scheduledDates];
    if (allDates.length === 0) return null;
    return allDates.reduce((max, current) => current > max ? current : max, allDates[0]);
  };

  const isCool = (effectiveLastUsed: string | null): boolean => {
    if (!effectiveLastUsed) return true;
    const usedDate = new Date(effectiveLastUsed);
    const assignDate = new Date(targetDateStr);
    if (usedDate >= assignDate) return false;
    const diffMonths = (assignDate.getFullYear() - usedDate.getFullYear()) * 12 + (assignDate.getMonth() - usedDate.getMonth());
    return diffMonths >= cooldownMonths;
  };

  const options: Array<{
    value: number;
    label: string;
    subLabel?: string;
    status: 'success' | 'warning' | 'danger' | 'neutral';
    statusLabel: string;
  }> = outlines.map(out => {
    const effectiveLastUsed = getEffectiveLastUsed(out);
    const isCoolStatus = isCool(effectiveLastUsed);
    let status: 'success' | 'warning' | 'danger' | 'neutral' = 'neutral';
    let statusLabel = '';

    if (!effectiveLastUsed) {
      status = 'success';
      statusLabel = 'Never Used';
    } else {
      const dateStr = new Date(effectiveLastUsed).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
      statusLabel = `Last used: ${dateStr}`;
      status = isCoolStatus ? 'success' : 'warning';
    }

    return { value: out.id, label: `#${out.id} - ${out.title}`, status, statusLabel };
  });

  options.unshift({ value: 0, label: 'Select Outline...', subLabel: undefined, status: 'neutral', statusLabel: '' });
  return options;
}

/**
 * Runs rotation arithmetic across all unlocked assignments for a month.
 */
export function autoFillMonthSchedule(
  currentAssignments: Assignment[],
  speakers: Speaker[],
  _outlines: Outline[],
  settings: AppSettings,
  year: number,
  monthIndex: number
): Assignment[] {
  const res = autoRotateMonth(currentAssignments, speakers, settings, year, monthIndex);
  return res.updatedAssignments;
}

/**
 * Applies authority roles (such as fixed Conductor or Auditorium Attendant) across unlocked dates.
 */
export function applyAuthorityRolesForSchedule(
  currentAssignments: Assignment[],
  settings: AppSettings,
  year: number,
  monthIndex: number
): { updatedAssignments: Assignment[]; appliedCount: number } {
  return applyAuthorityRoles(currentAssignments, settings, year, monthIndex);
}

/**
 * Clears duties for unlocked assignments in a specific month.
 */
export function clearDutiesForMonth(
  currentAssignments: Assignment[],
  year: number,
  monthIndex: number
): { updatedAssignments: Assignment[]; clearedCount: number } {
  return clearMonthAssignments(currentAssignments, year, monthIndex);
}

/**
 * React Hook providing a simplified, memoized interface for UI components.
 */
export function useScheduleCoordinator({
  assignments,
  speakers,
  outlines,
  settings,
  updateAssignments,
  updateSpeakers
}: {
  assignments: Assignment[];
  speakers: Speaker[];
  outlines: Outline[];
  settings: AppSettings;
  updateAssignments: (newAssignments: Assignment[]) => void;
  updateSpeakers: (newSpeakers: Speaker[]) => void;
}) {
  const handleEnsureMonth = useCallback((year: number, monthIndex: number) => {
    const updated = ensureMonthSchedule(assignments, year, monthIndex);
    updateAssignments(updated);
    return updated;
  }, [assignments, updateAssignments]);

  const handleAssignDuty = useCallback((assignmentId: string, role: string, brotherId: string | null) => {
    const updated = assignDuty(assignments, assignmentId, role, brotherId);
    updateAssignments(updated);
  }, [assignments, updateAssignments]);

  const handleAssignSpeakerAndOutline = useCallback((
    assignmentId: string,
    options: { speakerId?: string | null; outlineId?: number | null; customTalkTitle?: string; hostSpeakerId?: string | null }
  ) => {
    const updated = assignSpeakerAndOutline(assignments, assignmentId, options);
    updateAssignments(updated);
  }, [assignments, updateAssignments]);

  const handleAddGuestSpeaker = useCallback((input: {
    assignmentId: string;
    name: string;
    congregation: string;
    hostId?: string;
    outlineId?: number;
    customTalkTitle?: string;
  }) => {
    const result = addGuestSpeaker(assignments, speakers, input);
    updateSpeakers(result.speakers);
    updateAssignments(result.assignments);
    return result.guestSpeaker;
  }, [assignments, speakers, updateAssignments, updateSpeakers]);

  const handleToggleLock = useCallback((assignmentId: string, lockType: 'row' | 'speaker') => {
    const updated = toggleLock(assignments, assignmentId, lockType);
    updateAssignments(updated);
  }, [assignments, updateAssignments]);

  const handleAutoFillMonth = useCallback((year: number, monthIndex: number) => {
    const updated = autoFillMonthSchedule(assignments, speakers, outlines, settings, year, monthIndex);
    updateAssignments(updated);
    return updated;
  }, [assignments, speakers, outlines, settings, updateAssignments]);

  const getBrotherOptions = useCallback((dateStr: string, role: DutyRole, currentSelectedId?: string | null) => {
    return getCandidateBrothers(speakers, assignments, dateStr, role, currentSelectedId);
  }, [speakers, assignments]);

  const getOutlineOptionsForDate = useCallback((targetDateStr: string, currentAssignmentId?: string) => {
    return getOutlineOptions(outlines, assignments, targetDateStr, currentAssignmentId, settings.cooldownMonths);
  }, [outlines, assignments, settings.cooldownMonths]);

  const getConflicts = useCallback((assignment: Assignment) => {
    return detectAssignmentConflicts(assignment, speakers);
  }, [speakers]);

  return {
    ensureMonthSchedule: handleEnsureMonth,
    assignDuty: handleAssignDuty,
    assignSpeakerAndOutline: handleAssignSpeakerAndOutline,
    addGuestSpeaker: handleAddGuestSpeaker,
    toggleLock: handleToggleLock,
    autoFillMonthSchedule: handleAutoFillMonth,
    getBrotherOptions,
    getOutlineOptionsForDate,
    getConflicts
  };
}
