import { describe, it, expect } from 'vitest';
import {
  ensureMonthSundays,
  getLastRoleDate,
  autoRotateMonth,
  applyAuthorityRoles,
  clearMonthAssignments
} from '../domain/scheduleEngine';
import { Assignment, Speaker, AppSettings } from '../types';
import { DEFAULT_SETTINGS } from '../constants';

describe('ScheduleEngine Module', () => {
  const speakers: Speaker[] = [
    {
      id: 'elder1',
      name: 'Elder One',
      congregation: 'Central',
      isGuest: false,
      unavailableDates: [],
      lastAssigned: null,
      sortOrder: 1,
      spiritualStatus: 'elder'
    },
    {
      id: 'elder2',
      name: 'Elder Two',
      congregation: 'Central',
      isGuest: false,
      unavailableDates: [],
      lastAssigned: null,
      sortOrder: 2,
      spiritualStatus: 'elder'
    },
    {
      id: 'ms1',
      name: 'MS One',
      congregation: 'Central',
      isGuest: false,
      unavailableDates: [],
      lastAssigned: null,
      sortOrder: 3,
      spiritualStatus: 'ms'
    },
    {
      id: 'ms2',
      name: 'MS Two',
      congregation: 'Central',
      isGuest: false,
      unavailableDates: [],
      lastAssigned: null,
      sortOrder: 4,
      spiritualStatus: 'ms'
    },
    {
      id: 'pub1',
      name: 'Pub One',
      congregation: 'Central',
      isGuest: false,
      unavailableDates: [],
      lastAssigned: null,
      sortOrder: 5,
      spiritualStatus: 'publisher'
    },
    {
      id: 'pub2',
      name: 'Pub Two',
      congregation: 'Central',
      isGuest: false,
      unavailableDates: [],
      lastAssigned: null,
      sortOrder: 6,
      spiritualStatus: 'publisher'
    }
  ];

  const settings: AppSettings = {
    ...DEFAULT_SETTINGS,
    roleRules: {
      chairman: { role: 'chairman', frequency: 'weekly', rosterIds: ['elder1', 'elder2', 'ms1'] },
      conductor: { role: 'conductor', frequency: 'weekly', rosterIds: ['elder1', 'elder2'] },
      reader: { role: 'reader', frequency: 'weekly', rosterIds: ['ms1', 'ms2'] },
      attendant_entrance: { role: 'attendant_entrance', frequency: 'weekly', rosterIds: ['pub1', 'pub2'] },
      attendant_auditorium: { role: 'attendant_auditorium', frequency: 'weekly', rosterIds: ['pub1', 'pub2'] },
      mic: { role: 'mic', frequency: 'weekly', rosterIds: ['pub1', 'pub2'] }
    }
  };

  describe('ensureMonthSundays', () => {
    it('creates all Sundays in August 2026', () => {
      // In August 2026, Sundays are: Aug 2, Aug 9, Aug 16, Aug 23, Aug 30 (5 Sundays)
      const sundays = ensureMonthSundays([], 2026, 7);
      expect(sundays.length).toBe(5);
      expect(sundays[0].date).toBe('2026-08-02');
      expect(sundays[4].date).toBe('2026-08-30');
    });

    it('preserves existing assignments without creating duplicates', () => {
      const existing: Assignment[] = [{
        id: 'existing-1',
        date: '2026-08-02',
        speakerId: 'guest-1',
        outlineId: 50,
        locked: true
      }];
      const sundays = ensureMonthSundays(existing, 2026, 7);
      expect(sundays.length).toBe(5);
      expect(sundays.find(s => s.date === '2026-08-02')?.id).toBe('existing-1');
    });
  });

  describe('getLastRoleDate', () => {
    it('finds the most recent past date a brother served in a role', () => {
      const history: Assignment[] = [
        { id: '1', date: '2026-08-02', chairmanId: 'elder1', speakerId: null, outlineId: null, locked: false },
        { id: '2', date: '2026-08-09', chairmanId: 'elder2', speakerId: null, outlineId: null, locked: false },
        { id: '3', date: '2026-08-16', chairmanId: 'elder1', speakerId: null, outlineId: null, locked: false }
      ];

      const lastDate = getLastRoleDate(history, 'elder1', 'chairman', '2026-08-23');
      expect(lastDate).toBe('2026-08-16');
    });
  });

  describe('autoRotateMonth', () => {
    it('populates duties for unlocked meetings without collision', () => {
      const result = autoRotateMonth([], speakers, settings, 2026, 7);
      expect(result.updatedAssignments.length).toBe(5);
      expect(result.newlyFilledIds.length).toBe(5);

      result.updatedAssignments.forEach(a => {
        expect(a.chairmanId).toBeTruthy();
        expect(a.conductorId).toBeTruthy();
        expect(a.readerId).toBeTruthy();
        // Check no brother has two duties on the same meeting
        const duties = [
          a.chairmanId,
          a.conductorId,
          a.readerId,
          a.entranceAttendantId,
          a.auditoriumAttendantId,
          ...(a.micServerIds || [])
        ].filter(Boolean);

        const uniqueDuties = new Set(duties);
        expect(duties.length).toBe(uniqueDuties.size);
      });
    });

    it('skips locked meetings during auto-rotation', () => {
      const lockedAssignment: Assignment = {
        id: 'locked-aug-2',
        date: '2026-08-02',
        chairmanId: 'elder1',
        speakerId: null,
        outlineId: null,
        locked: true
      };

      const result = autoRotateMonth([lockedAssignment], speakers, settings, 2026, 7);
      const firstMeeting = result.updatedAssignments.find(a => a.date === '2026-08-02');
      expect(firstMeeting?.id).toBe('locked-aug-2');
      expect(result.newlyFilledIds).not.toContain('locked-aug-2');
    });
  });

  describe('applyAuthorityRoles', () => {
    it('sets authority roles across unlocked meetings in the target month', () => {
      const authSettings: AppSettings = {
        ...settings,
        authorityRoles: {
          conductorId: 'elder1',
          auditoriumAttendantId: 'pub1'
        }
      };

      const sundays = ensureMonthSundays([], 2026, 7);
      const result = applyAuthorityRoles(sundays, authSettings, 2026, 7);

      expect(result.appliedCount).toBe(10); // 2 roles * 5 meetings
      result.updatedAssignments.forEach(a => {
        expect(a.conductorId).toBe('elder1');
        expect(a.auditoriumAttendantId).toBe('pub1');
      });
    });
  });

  describe('clearMonthAssignments', () => {
    it('resets all duties on unlocked meetings in the target month', () => {
      const autoRotated = autoRotateMonth([], speakers, settings, 2026, 7).updatedAssignments;
      const cleared = clearMonthAssignments(autoRotated, 2026, 7);

      expect(cleared.clearedCount).toBe(5);
      cleared.updatedAssignments.forEach(a => {
        expect(a.chairmanId).toBeNull();
        expect(a.conductorId).toBeNull();
        expect(a.readerId).toBeNull();
      });
    });
  });

  describe('Historical & Past Weeks Support', () => {
    it('generates all Sundays for any past month (e.g. July 2026 has 4 Sundays)', () => {
      const pastSundays = ensureMonthSundays([], 2026, 6); // Month 6 = July (0-indexed)
      expect(pastSundays.length).toBe(4);
      expect(pastSundays[0].date).toBe('2026-07-05');
      expect(pastSundays[1].date).toBe('2026-07-12');
      expect(pastSundays[2].date).toBe('2026-07-19');
      expect(pastSundays[3].date).toBe('2026-07-26');
    });

    it('allows auto-rotation on past months', () => {
      const result = autoRotateMonth([], speakers, settings, 2026, 6);
      expect(result.updatedAssignments.length).toBe(4);
      expect(result.newlyFilledIds.length).toBe(4);
      result.updatedAssignments.forEach(a => {
        expect(a.chairmanId).toBeTruthy();
        expect(a.conductorId).toBeTruthy();
      });
    });

    it('uses backfilled past assignments to influence future rotation sequencing', () => {
      // If elder1 served as chairman on July 26, elder2 should be prioritized for Aug 2
      const july26Assignment: Assignment = {
        id: 'july-26',
        date: '2026-07-26',
        chairmanId: 'elder1',
        speakerId: null,
        outlineId: null,
        locked: false
      };

      const augResult = autoRotateMonth([july26Assignment], speakers, settings, 2026, 7);
      const firstAugMeeting = augResult.updatedAssignments.find(a => a.date === '2026-08-02');
      expect(firstAugMeeting?.chairmanId).toBe('elder2');
    });
  });
});
