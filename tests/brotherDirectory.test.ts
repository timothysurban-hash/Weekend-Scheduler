import { describe, it, expect } from 'vitest';
import {
  getBrotherLastAssignment,
  filterBrothers,
  sortBrothers,
  createBrotherRecord
} from '../domain/brotherDirectory';
import { Speaker, Assignment } from '../types';

describe('BrotherDirectory Module', () => {
  const brothers: Speaker[] = [
    { id: 'b1', name: 'Zack Elder', congregation: 'North', isGuest: false, unavailableDates: [], lastAssigned: null, sortOrder: 3, spiritualStatus: 'elder' },
    { id: 'b2', name: 'Aaron MS', congregation: 'North', isGuest: false, unavailableDates: [], lastAssigned: '2026-08-02', sortOrder: 1, spiritualStatus: 'ms' },
    { id: 'b3', name: 'David Pub', congregation: 'South', isGuest: false, unavailableDates: [], lastAssigned: '2026-08-09', sortOrder: 2, spiritualStatus: 'publisher' },
    { id: 'b4', name: 'Guest Speaker', congregation: 'West', isGuest: true, unavailableDates: [], lastAssigned: null, sortOrder: 4, spiritualStatus: 'elder' }
  ];

  const assignments: Assignment[] = [
    { id: 'a1', date: '2026-08-16', speakerId: null, outlineId: null, chairmanId: 'b1', locked: false },
    { id: 'a2', date: '2026-08-23', speakerId: 'b4', outlineId: null, hostSpeakerId: 'b2', locked: false }
  ];

  describe('getBrotherLastAssignment', () => {
    it('returns latest duty assignment date', () => {
      const history = getBrotherLastAssignment(brothers[0], assignments);
      expect(history).toEqual({ date: '2026-08-16', isHost: false });
    });

    it('identifies hosting duty when latest date comes from hostSpeakerId', () => {
      const history = getBrotherLastAssignment(brothers[1], assignments);
      expect(history).toEqual({ date: '2026-08-23', isHost: true });
    });

    it('falls back to brother.lastAssigned if no assignments exist in list', () => {
      const history = getBrotherLastAssignment(brothers[2], []);
      expect(history).toEqual({ date: '2026-08-09', isHost: false });
    });

    it('returns null if brother has never served and no lastAssigned', () => {
      const neverAssigned: Speaker = { ...brothers[0], id: 'b99', lastAssigned: null };
      const history = getBrotherLastAssignment(neverAssigned, []);
      expect(history).toBeNull();
    });
  });

  describe('filterBrothers', () => {
    it('excludes guests by default', () => {
      const filtered = filterBrothers(brothers);
      expect(filtered.length).toBe(3);
      expect(filtered.find(b => b.isGuest)).toBeUndefined();
    });

    it('filters by search query matching name or congregation', () => {
      const byName = filterBrothers(brothers, { searchQuery: 'aaron' });
      expect(byName.length).toBe(1);
      expect(byName[0].id).toBe('b2');

      const byCong = filterBrothers(brothers, { searchQuery: 'south' });
      expect(byCong.length).toBe(1);
      expect(byCong[0].id).toBe('b3');
    });

    it('filters by spiritual status', () => {
      const elders = filterBrothers(brothers, { statusFilter: 'elder' });
      expect(elders.length).toBe(1);
      expect(elders[0].name).toBe('Zack Elder');
    });

    it('filters by qualified duty role', () => {
      const conductors = filterBrothers(brothers, { roleFilter: 'conductor' });
      expect(conductors.length).toBe(1);
      expect(conductors[0].spiritualStatus).toBe('elder');
    });
  });

  describe('sortBrothers', () => {
    it('sorts by rotation sequence (sortOrder)', () => {
      const sorted = sortBrothers(brothers.slice(0, 3), 'rotation');
      expect(sorted.map(b => b.id)).toEqual(['b2', 'b3', 'b1']);
    });

    it('sorts by name ascending and descending', () => {
      const asc = sortBrothers(brothers.slice(0, 3), 'name_asc');
      expect(asc[0].name).toBe('Aaron MS');
      expect(asc[2].name).toBe('Zack Elder');

      const desc = sortBrothers(brothers.slice(0, 3), 'name_desc');
      expect(desc[0].name).toBe('Zack Elder');
      expect(desc[2].name).toBe('Aaron MS');
    });

    it('sorts by spiritual status hierarchy (Elder > MS > Publisher > UP)', () => {
      const sorted = sortBrothers(brothers.slice(0, 3), 'status');
      expect(sorted[0].spiritualStatus).toBe('elder');
      expect(sorted[1].spiritualStatus).toBe('ms');
      expect(sorted[2].spiritualStatus).toBe('publisher');
    });

    it('sorts by last assigned date with oldest/never assigned first', () => {
      const sorted = sortBrothers(brothers.slice(0, 3), 'last_assigned', assignments);
      // b3 is 2026-08-09, b1 is 2026-08-16, b2 is 2026-08-23
      expect(sorted[0].id).toBe('b3');
      expect(sorted[1].id).toBe('b1');
      expect(sorted[2].id).toBe('b2');
    });
  });

  describe('createBrotherRecord', () => {
    it('creates normalized brother record with auto-incremented sort order', () => {
      const newRec = createBrotherRecord(
        { name: 'Timothy Brother', spiritualStatus: 'ms' },
        brothers,
        'Central'
      );

      expect(newRec.id).toBeDefined();
      expect(newRec.name).toBe('Timothy Brother');
      expect(newRec.congregation).toBe('Central');
      expect(newRec.sortOrder).toBe(5);
      expect(newRec.spiritualStatus).toBe('ms');
      expect(newRec.qualifications).toContain('chairman');
      expect(newRec.qualifications).not.toContain('conductor');
    });
  });
});
