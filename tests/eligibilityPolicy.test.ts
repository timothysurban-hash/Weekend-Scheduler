import { describe, it, expect } from 'vitest';
import {
  getCandidateStatus,
  getDefaultQualificationsForStatus,
  isBrotherQualifiedForRole,
  isCandidateEligible
} from '../domain/eligibilityPolicy';
import { Speaker } from '../types';

describe('EligibilityPolicy Module', () => {
  const elder: Speaker = {
    id: 'b1',
    name: 'Brother Elder',
    congregation: 'Central',
    isGuest: false,
    unavailableDates: ['2026-08-16'],
    lastAssigned: null,
    sortOrder: 1,
    spiritualStatus: 'elder'
  };

  const ms: Speaker = {
    id: 'b2',
    name: 'Brother MS',
    congregation: 'Central',
    isGuest: false,
    unavailableDates: [],
    lastAssigned: null,
    sortOrder: 2,
    spiritualStatus: 'ms'
  };

  const publisher: Speaker = {
    id: 'b3',
    name: 'Brother Publisher',
    congregation: 'Central',
    isGuest: false,
    unavailableDates: [],
    lastAssigned: null,
    sortOrder: 3,
    spiritualStatus: 'publisher'
  };

  const up: Speaker = {
    id: 'b4',
    name: 'Brother Unbaptized',
    congregation: 'Central',
    isGuest: false,
    unavailableDates: [],
    lastAssigned: null,
    sortOrder: 4,
    spiritualStatus: 'up'
  };

  describe('getCandidateStatus', () => {
    it('returns direct spiritualStatus property when available', () => {
      expect(getCandidateStatus(elder)).toBe('elder');
      expect(getCandidateStatus(ms)).toBe('ms');
      expect(getCandidateStatus(publisher)).toBe('publisher');
      expect(getCandidateStatus(up)).toBe('up');
    });

    it('infers status from customTags when spiritualStatus is absent', () => {
      const untypedElder: Speaker = { ...elder, spiritualStatus: undefined, customTags: ['Elder'] };
      const untypedMS: Speaker = { ...ms, spiritualStatus: undefined, customTags: ['Ministerial Servant'] };
      const untypedUP: Speaker = { ...up, spiritualStatus: undefined, customTags: ['Unbaptized Publisher'] };
      const untypedPub: Speaker = { ...publisher, spiritualStatus: undefined, customTags: [] };

      expect(getCandidateStatus(untypedElder)).toBe('elder');
      expect(getCandidateStatus(untypedMS)).toBe('ms');
      expect(getCandidateStatus(untypedUP)).toBe('up');
      expect(getCandidateStatus(untypedPub)).toBe('publisher');
    });
  });

  describe('getDefaultQualificationsForStatus', () => {
    it('returns all roles for elder', () => {
      const quals = getDefaultQualificationsForStatus('elder');
      expect(quals).toContain('chairman');
      expect(quals).toContain('conductor');
      expect(quals).toContain('reader');
      expect(quals).toContain('mic');
    });

    it('excludes conductor for MS', () => {
      const quals = getDefaultQualificationsForStatus('ms');
      expect(quals).toContain('chairman');
      expect(quals).toContain('reader');
      expect(quals).not.toContain('conductor');
    });

    it('allows only attendants and mic for publisher', () => {
      const quals = getDefaultQualificationsForStatus('publisher');
      expect(quals).toEqual(['attendant_entrance', 'attendant_auditorium', 'mic']);
    });

    it('allows only mic for up', () => {
      const quals = getDefaultQualificationsForStatus('up');
      expect(quals).toEqual(['mic']);
    });
  });

  describe('isBrotherQualifiedForRole', () => {
    it('qualifies elders for conductor and chairman', () => {
      expect(isBrotherQualifiedForRole(elder, 'conductor')).toBe(true);
      expect(isBrotherQualifiedForRole(elder, 'chairman')).toBe(true);
    });

    it('does not qualify MS for conductor by default', () => {
      expect(isBrotherQualifiedForRole(ms, 'conductor')).toBe(false);
      expect(isBrotherQualifiedForRole(ms, 'chairman')).toBe(true);
    });

    it('does not qualify Publisher for chairman or reader', () => {
      expect(isBrotherQualifiedForRole(publisher, 'chairman')).toBe(false);
      expect(isBrotherQualifiedForRole(publisher, 'reader')).toBe(false);
      expect(isBrotherQualifiedForRole(publisher, 'mic')).toBe(true);
    });

    it('qualifies Unbaptized Publisher only for mic', () => {
      expect(isBrotherQualifiedForRole(up, 'mic')).toBe(true);
      expect(isBrotherQualifiedForRole(up, 'attendant_entrance')).toBe(false);
    });
  });

  describe('isCandidateEligible', () => {
    it('rejects candidate on blacklisted dates', () => {
      const assigned = new Set<string>();
      expect(isCandidateEligible(elder, 'chairman', '2026-08-16', assigned)).toBe(false);
      expect(isCandidateEligible(elder, 'chairman', '2026-08-23', assigned)).toBe(true);
    });

    it('rejects candidate if already assigned to a duty in the same meeting', () => {
      const assigned = new Set<string>(['b1']);
      expect(isCandidateEligible(elder, 'chairman', '2026-08-23', assigned)).toBe(false);
    });

    it('enforces active roster filter if provided', () => {
      const assigned = new Set<string>();
      expect(isCandidateEligible(elder, 'chairman', '2026-08-23', assigned, ['b2'])).toBe(false);
      expect(isCandidateEligible(elder, 'chairman', '2026-08-23', assigned, ['b1'])).toBe(true);
    });
  });
});
