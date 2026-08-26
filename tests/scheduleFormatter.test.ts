import { describe, it, expect } from 'vitest';
import {
  formatBrotherNamesForClipboard,
  formatScheduleCsv,
  formatTagalogMeetingDate,
  formatPrintOutlineInfo,
  chunkAssignmentsForPrint,
  generateSchedulePdfTitle
} from '../domain/scheduleFormatter';
import { Assignment, Speaker, Outline } from '../types';

describe('ScheduleFormatter Module', () => {
  const speakers: Speaker[] = [
    { id: 'b1', name: 'John Doe', congregation: 'Central', isGuest: false, unavailableDates: [], lastAssigned: null, sortOrder: 1 },
    { id: 'b2', name: 'James Smith', congregation: 'Central', isGuest: false, unavailableDates: [], lastAssigned: null, sortOrder: 2 },
    { id: 'b3', name: 'Mark Evans', congregation: 'North', isGuest: true, unavailableDates: [], lastAssigned: null, sortOrder: 3 },
    { id: 'b4', name: 'Luke Davis', congregation: 'Central', isGuest: false, unavailableDates: [], lastAssigned: null, sortOrder: 4 }
  ];

  const outlines: Outline[] = [
    { id: 101, title: 'Making a Good Name With God', lastUsed: null, lastSpeakerId: null, lastCongregation: null },
    { id: 17, title: 'Gamitin ang Lahat ng Taglay Mo Para Luwalhatiin ang Diyos', lastUsed: null, lastSpeakerId: null, lastCongregation: null }
  ];

  const assignment: Assignment = {
    id: 'a1',
    date: '2026-08-23',
    speakerId: 'b3',
    outlineId: 101,
    chairmanId: 'b1',
    conductorId: 'b2',
    readerId: 'b4',
    entranceAttendantId: 'b1',
    auditoriumAttendantId: 'b2',
    micServerIds: ['b4'],
    locked: false
  };

  describe('formatTagalogMeetingDate', () => {
    it('formats YYYY-MM-DD into Tagalog month and day uppercase', () => {
      expect(formatTagalogMeetingDate('2026-08-09')).toBe('AGOSTO 9');
      expect(formatTagalogMeetingDate('2026-09-06')).toBe('SETYEMBRE 6');
      expect(formatTagalogMeetingDate('2026-09-13')).toBe('SETYEMBRE 13');
    });
  });

  describe('formatPrintOutlineInfo', () => {
    it('returns outline number and title for standard outlines', () => {
      const info = formatPrintOutlineInfo(assignment, outlines);
      expect(info).toEqual({ number: '101', title: 'Making a Good Name With God' });
    });

    it('returns ST for custom talk titles without outline', () => {
      const customAssignment: Assignment = {
        ...assignment,
        outlineId: null,
        customTalkTitle: 'Special Discourse'
      };
      const info = formatPrintOutlineInfo(customAssignment, outlines);
      expect(info).toEqual({ number: 'ST', title: 'Special Discourse' });
    });

    it('returns SE for special events', () => {
      const eventAssignment: Assignment = {
        ...assignment,
        isSpecialEvent: true,
        specialEventTitle: 'Circuit Assembly'
      };
      const info = formatPrintOutlineInfo(eventAssignment, outlines);
      expect(info).toEqual({ number: 'SE', title: 'Circuit Assembly' });
    });
  });

  describe('formatBrotherNamesForClipboard', () => {
    it('extracts unique valid brother names into newline-separated text', () => {
      const result = formatBrotherNamesForClipboard(assignment, speakers);
      expect(result.count).toBe(7);
      expect(result.text).toContain('John Doe');
      expect(result.text).toContain('James Smith');
      expect(result.text).toContain('Mark Evans');
      expect(result.text).toContain('Luke Davis');
      expect(result.formattedDate).toBeDefined();
    });

    it('handles empty assignments cleanly', () => {
      const emptyAssignment: Assignment = {
        id: 'a2',
        date: '2026-08-30',
        speakerId: null,
        outlineId: null,
        locked: false
      };
      const result = formatBrotherNamesForClipboard(emptyAssignment, speakers);
      expect(result.count).toBe(0);
      expect(result.text).toBe('');
    });
  });

  describe('formatScheduleCsv', () => {
    it('generates standard CSV with correct header and quoted values', () => {
      const csv = formatScheduleCsv([assignment], speakers, outlines);
      expect(csv).toContain('Date,Special Event,Public Speaker,Talk Title');
      expect(csv).toContain('"2026-08-23"');
      expect(csv).toContain('"Mark Evans"');
      expect(csv).toContain('"Making a Good Name With God"');
      expect(csv).toContain('"John Doe"');
    });
  });

  describe('chunkAssignmentsForPrint', () => {
    it('returns empty array when assignments are empty', () => {
      expect(chunkAssignmentsForPrint([])).toEqual([]);
    });

    it('returns 1 batch for <= 3 assignments', () => {
      const a1: Assignment = { id: '1', date: '2026-09-06', locked: false };
      const a2: Assignment = { id: '2', date: '2026-09-13', locked: false };
      const a3: Assignment = { id: '3', date: '2026-09-20', locked: false };

      const batches = chunkAssignmentsForPrint([a1, a2, a3], 3);
      expect(batches).toHaveLength(1);
      expect(batches[0].id).toBe('batch-1');
      expect(batches[0].label).toBe('Weeks 1–3');
      expect(batches[0].assignments).toHaveLength(3);
    });

    it('chunks 4 assignments into 2 batches (Weeks 1–3 and Week 4)', () => {
      const a1: Assignment = { id: '1', date: '2026-09-06', locked: false };
      const a2: Assignment = { id: '2', date: '2026-09-13', locked: false };
      const a3: Assignment = { id: '3', date: '2026-09-20', locked: false };
      const a4: Assignment = { id: '4', date: '2026-09-27', locked: false };

      const batches = chunkAssignmentsForPrint([a1, a2, a3, a4], 3);
      expect(batches).toHaveLength(2);
      expect(batches[0].label).toBe('Weeks 1–3');
      expect(batches[0].assignments).toEqual([a1, a2, a3]);
      expect(batches[1].label).toBe('Week 4');
      expect(batches[1].assignments).toEqual([a4]);
    });

    it('chunks 5 assignments into 2 batches (Weeks 1–3 and Weeks 4–5)', () => {
      const a1: Assignment = { id: '1', date: '2026-08-02', locked: false };
      const a2: Assignment = { id: '2', date: '2026-08-09', locked: false };
      const a3: Assignment = { id: '3', date: '2026-08-16', locked: false };
      const a4: Assignment = { id: '4', date: '2026-08-23', locked: false };
      const a5: Assignment = { id: '5', date: '2026-08-30', locked: false };

      const batches = chunkAssignmentsForPrint([a1, a2, a3, a4, a5], 3);
      expect(batches).toHaveLength(2);
      expect(batches[0].label).toBe('Weeks 1–3');
      expect(batches[0].assignments).toEqual([a1, a2, a3]);
      expect(batches[1].label).toBe('Weeks 4–5');
      expect(batches[1].assignments).toEqual([a4, a5]);
    });

    it('chunks 6 assignments into 2 batches (Weeks 1–3 and Weeks 4–6)', () => {
      const assignments: Assignment[] = Array.from({ length: 6 }, (_, i) => ({
        id: `a${i + 1}`,
        date: `2026-08-${String(i + 1).padStart(2, '0')}`,
        locked: false
      }));

      const batches = chunkAssignmentsForPrint(assignments, 3);
      expect(batches).toHaveLength(2);
      expect(batches[0].label).toBe('Weeks 1–3');
      expect(batches[1].label).toBe('Weeks 4–6');
    });
  });

  describe('generateSchedulePdfTitle', () => {
    it('generates consistent formatted title for browser Save as PDF dialog', () => {
      expect(generateSchedulePdfTitle('2026-09-06', '2026-09-27')).toBe('Weekend Schedule_Sept 06 2026 to Sept 27 2026');
      expect(generateSchedulePdfTitle('2026-09-27', '2026-10-11')).toBe('Weekend Schedule_Sept 27 2026 to Oct 11 2026');
    });
  });
});
