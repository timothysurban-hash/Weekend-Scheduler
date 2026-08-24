import { describe, it, expect } from 'vitest';
import { isUpcomingSunday, getYearMonth, formatViewMonth } from '../utils/dateUtils';

describe('dateUtils', () => {
  it('parses YYYY-MM-DD into year and 0-indexed month', () => {
    expect(getYearMonth('2026-08-23')).toEqual({ year: 2026, month: 7 });
    expect(getYearMonth('2026-01-01')).toEqual({ year: 2026, month: 0 });
    expect(getYearMonth('invalid')).toEqual({ year: 0, month: 0 });
  });

  it('formats Date object to month and year string', () => {
    const d = new Date(2026, 7, 23);
    expect(formatViewMonth(d)).toContain('2026');
    expect(formatViewMonth(d)).toContain('August');
  });

  it('evaluates isUpcomingSunday correctly', () => {
    expect(isUpcomingSunday('invalid-date')).toBe(false);
  });
});
