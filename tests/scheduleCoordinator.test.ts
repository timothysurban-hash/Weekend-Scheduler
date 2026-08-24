import { describe, it, expect } from 'vitest';
import {
  ensureMonthSchedule,
  assignDuty,
  assignSpeakerAndOutline,
  addGuestSpeaker,
  toggleLock,
  detectAssignmentConflicts,
  getCandidateBrothers,
  getOutlineOptions,
  autoFillMonthSchedule
} from '../domain/scheduleCoordinator';
import { Assignment, Speaker, Outline, AppSettings } from '../types';
import { DEFAULT_SETTINGS } from '../constants';

describe('ScheduleCoordinator Deep Module', () => {
  const speakers: Speaker[] = [
    {
      id: 'sp-elder',
      name: 'Brother Elder',
      congregation: 'Local',
      isGuest: false,
      unavailableDates: ['2026-09-13'],
      lastAssigned: null,
      sortOrder: 1,
      spiritualStatus: 'elder',
      qualifications: ['speaker', 'chairman', 'conductor', 'reader', 'mic', 'attendant_entrance', 'attendant_auditorium']
    },
    {
      id: 'sp-ms',
      name: 'Brother MS',
      congregation: 'Local',
      isGuest: false,
      unavailableDates: [],
      lastAssigned: null,
      sortOrder: 2,
      spiritualStatus: 'ms',
      qualifications: ['chairman', 'reader', 'mic', 'attendant_entrance', 'attendant_auditorium']
    },
    {
      id: 'sp-pub',
      name: 'Brother Publisher',
      congregation: 'Local',
      isGuest: false,
      unavailableDates: [],
      lastAssigned: null,
      sortOrder: 3,
      spiritualStatus: 'publisher',
      qualifications: ['mic', 'attendant_entrance', 'attendant_auditorium']
    }
  ];

  const outlines: Outline[] = [
    { id: 1, title: 'Who Is God?', lastUsed: '2025-01-01', lastSpeakerId: null, lastCongregation: null },
    { id: 2, title: 'Will You Survive?', lastUsed: '2026-08-01', lastSpeakerId: null, lastCongregation: null },
    { id: 3, title: 'Never Used Talk', lastUsed: null, lastSpeakerId: null, lastCongregation: null }
  ];

  const settings: AppSettings = {
    ...DEFAULT_SETTINGS,
    cooldownMonths: 6
  };

  describe('ensureMonthSchedule', () => {
    it('creates missing Sunday meeting assignments for a given year and month', () => {
      const existing: Assignment[] = [
        {
          id: 'existing-1',
          date: '2026-09-06',
          speakerId: 'sp-elder',
          outlineId: null,
          locked: false
        }
      ];

      // September 2026 has Sundays on 6, 13, 20, 27
      const result = ensureMonthSchedule(existing, 2026, 8); // month index 8 is September
      expect(result.length).toBe(4);
      expect(result.find(a => a.date === '2026-09-06')?.id).toBe('existing-1');
      expect(result.some(a => a.date === '2026-09-13')).toBe(true);
      expect(result.some(a => a.date === '2026-09-20')).toBe(true);
      expect(result.some(a => a.date === '2026-09-27')).toBe(true);
    });
  });

  describe('assignDuty', () => {
    it('assigns a single duty role to a brother when assignment is unlocked', () => {
      const assignments: Assignment[] = [
        { id: 'a1', date: '2026-09-06', speakerId: null, outlineId: null, chairmanId: null, locked: false }
      ];

      const result = assignDuty(assignments, 'a1', 'chairman', 'sp-elder');
      expect(result.find(a => a.id === 'a1')?.chairmanId).toBe('sp-elder');
    });

    it('handles mic duty indexing (mic 1 and mic 2)', () => {
      const assignments: Assignment[] = [
        { id: 'a1', date: '2026-09-06', speakerId: null, outlineId: null, micServerIds: ['sp-ms'], locked: false }
      ];

      const updated1 = assignDuty(assignments, 'a1', 'mic_2', 'sp-pub');
      expect(updated1.find(a => a.id === 'a1')?.micServerIds).toEqual(['sp-ms', 'sp-pub']);

      const updated2 = assignDuty(updated1, 'a1', 'mic_1', null);
      expect(updated2.find(a => a.id === 'a1')?.micServerIds).toEqual(['sp-pub']);
    });

    it('rejects changes when the assignment row is locked', () => {
      const assignments: Assignment[] = [
        { id: 'a1', date: '2026-09-06', speakerId: null, outlineId: null, chairmanId: 'sp-elder', locked: true }
      ];

      const result = assignDuty(assignments, 'a1', 'chairman', 'sp-ms');
      expect(result.find(a => a.id === 'a1')?.chairmanId).toBe('sp-elder');
    });
  });

  describe('assignSpeakerAndOutline', () => {
    it('sets speaker and clears outline when speaker changes', () => {
      const assignments: Assignment[] = [
        { id: 'a1', date: '2026-09-06', speakerId: 'sp-elder', outlineId: 1, locked: false }
      ];

      const result = assignSpeakerAndOutline(assignments, 'a1', { speakerId: 'sp-ms' });
      const updated = result.find(a => a.id === 'a1');
      expect(updated?.speakerId).toBe('sp-ms');
      expect(updated?.outlineId).toBeNull();
    });

    it('sets standard outline and clears custom talk title', () => {
      const assignments: Assignment[] = [
        { id: 'a1', date: '2026-09-06', speakerId: 'sp-elder', outlineId: null, customTalkTitle: 'Special Discourse', locked: false }
      ];

      const result = assignSpeakerAndOutline(assignments, 'a1', { outlineId: 2 });
      const updated = result.find(a => a.id === 'a1');
      expect(updated?.outlineId).toBe(2);
      expect(updated?.customTalkTitle).toBe('');
    });

    it('sets custom talk title and clears standard outline', () => {
      const assignments: Assignment[] = [
        { id: 'a1', date: '2026-09-06', speakerId: 'sp-elder', outlineId: 1, locked: false }
      ];

      const result = assignSpeakerAndOutline(assignments, 'a1', { customTalkTitle: 'Visiting Discourse' });
      const updated = result.find(a => a.id === 'a1');
      expect(updated?.customTalkTitle).toBe('Visiting Discourse');
      expect(updated?.outlineId).toBeNull();
    });
  });

  describe('addGuestSpeaker', () => {
    it('creates a new guest brother and assigns them to the meeting date', () => {
      const currentAssignments: Assignment[] = [
        { id: 'a1', date: '2026-09-06', speakerId: null, outlineId: null, locked: false }
      ];

      const { assignments: updatedAssignments, speakers: updatedSpeakers, guestSpeaker } = addGuestSpeaker(
        currentAssignments,
        speakers,
        {
          assignmentId: 'a1',
          name: 'Visiting Speaker Brother',
          congregation: 'North Congregation',
          hostId: 'sp-elder',
          outlineId: 3,
          customTalkTitle: ''
        }
      );

      expect(guestSpeaker.isGuest).toBe(true);
      expect(guestSpeaker.name).toBe('Visiting Speaker Brother');
      expect(updatedSpeakers.some(s => s.id === guestSpeaker.id)).toBe(true);

      const targetAssignment = updatedAssignments.find(a => a.id === 'a1');
      expect(targetAssignment?.speakerId).toBe(guestSpeaker.id);
      expect(targetAssignment?.hostSpeakerId).toBe('sp-elder');
      expect(targetAssignment?.outlineId).toBe(3);
    });
  });

  describe('toggleLock', () => {
    it('toggles assignment row lock', () => {
      const assignments: Assignment[] = [
        { id: 'a1', date: '2026-09-06', speakerId: null, outlineId: null, locked: false, speakerLocked: false }
      ];

      const locked = toggleLock(assignments, 'a1', 'row');
      expect(locked.find(a => a.id === 'a1')?.locked).toBe(true);

      const unlocked = toggleLock(locked, 'a1', 'row');
      expect(unlocked.find(a => a.id === 'a1')?.locked).toBe(false);
    });

    it('toggles speaker-specific lock', () => {
      const assignments: Assignment[] = [
        { id: 'a1', date: '2026-09-06', speakerId: null, outlineId: null, locked: false, speakerLocked: false }
      ];

      const locked = toggleLock(assignments, 'a1', 'speaker');
      expect(locked.find(a => a.id === 'a1')?.speakerLocked).toBe(true);
    });
  });

  describe('detectAssignmentConflicts', () => {
    it('detects double-booking conflict when a brother is assigned to multiple non-auditorium roles', () => {
      const conflictAssignment: Assignment = {
        id: 'a1',
        date: '2026-09-06',
        speakerId: null,
        outlineId: null,
        chairmanId: 'sp-elder',
        conductorId: 'sp-elder', // Conflict: Chairman & Conductor
        readerId: 'sp-ms',
        locked: false
      };

      const conflicts = detectAssignmentConflicts(conflictAssignment, speakers);
      expect(conflicts.length).toBe(1);
      expect(conflicts[0]).toContain('Brother Elder (Chairman & WT Conductor)');
    });

    it('allows Auditorium Attendant double-booking without conflict', () => {
      const allowedAssignment: Assignment = {
        id: 'a1',
        date: '2026-09-06',
        speakerId: null,
        outlineId: null,
        chairmanId: 'sp-elder',
        auditoriumAttendantId: 'sp-elder', // Allowed dual-role
        locked: false
      };

      const conflicts = detectAssignmentConflicts(allowedAssignment, speakers);
      expect(conflicts.length).toBe(0);
    });
  });

  describe('getCandidateBrothers', () => {
    it('filters out unavailable brothers based on blackout dates', () => {
      // Brother Elder is unavailable on 2026-09-13
      const candidates = getCandidateBrothers(speakers, [], '2026-09-13', 'chairman', null);
      const elderCandidate = candidates.find(c => c.value === 'sp-elder');
      expect(elderCandidate?.status).toBe('danger');
      expect(elderCandidate?.statusLabel).toContain('Unavailable');
    });

    it('filters brothers by spiritual status and qualifications', () => {
      // Publisher is not qualified for Chairman
      const candidates = getCandidateBrothers(speakers, [], '2026-09-06', 'chairman', null);
      expect(candidates.some(c => c.value === 'sp-pub')).toBe(false);
      expect(candidates.some(c => c.value === 'sp-elder')).toBe(true);
      expect(candidates.some(c => c.value === 'sp-ms')).toBe(true);
    });
  });

  describe('getOutlineOptions', () => {
    it('evaluates outline cooldown status correctly', () => {
      // Target date: 2026-09-06, cooldown 6 months
      // Outline 1 was used 2025-01-01 (>6 months ago) -> success / cool
      // Outline 2 was used 2026-08-01 (<6 months ago) -> warning / not cool
      // Outline 3 never used -> success / never used
      const options = getOutlineOptions(outlines, [], '2026-09-06', 'a1', settings.cooldownMonths);

      const o1 = options.find(o => o.value === 1);
      expect(o1?.status).toBe('success');

      const o2 = options.find(o => o.value === 2);
      expect(o2?.status).toBe('warning');

      const o3 = options.find(o => o.value === 3);
      expect(o3?.status).toBe('success');
      expect(o3?.statusLabel).toBe('Never Used');
    });
  });

  describe('autoFillMonthSchedule', () => {
    it('fills unlocked assignments for the month using rotation engine', () => {
      const monthAssignments: Assignment[] = [
        { id: 'a1', date: '2026-09-06', speakerId: null, outlineId: null, locked: false },
        { id: 'a2', date: '2026-09-13', speakerId: null, outlineId: null, locked: false }
      ];

      const result = autoFillMonthSchedule(monthAssignments, speakers, outlines, settings, 2026, 8);
      expect(result.length).toBe(4);
      expect(result[0].chairmanId).toBeDefined();
      expect(result[0].conductorId).toBeDefined();
    });
  });
});
