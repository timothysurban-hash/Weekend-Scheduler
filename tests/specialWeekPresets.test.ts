import { describe, it, expect } from 'vitest';
import { SPECIAL_EVENT_PRESETS, getSpecialEventPresetDetails } from '../constants';
import { SpecialEventType } from '../types';

describe('Special Week Presets and Constants', () => {
  it('defines all required preset keys', () => {
    const keys = SPECIAL_EVENT_PRESETS.map(p => p.key);
    expect(keys).toContain('circuit_assembly');
    expect(keys).toContain('regional_convention');
    expect(keys).toContain('circuit_overseer_visit');
    expect(keys).toContain('memorial');
    expect(keys).toContain('special_talk');
    expect(keys).toContain('custom');
  });

  it('sets noMeeting default to true for assemblies and conventions', () => {
    const ca = SPECIAL_EVENT_PRESETS.find(p => p.key === 'circuit_assembly');
    const rc = SPECIAL_EVENT_PRESETS.find(p => p.key === 'regional_convention');
    expect(ca?.defaultNoMeeting).toBe(true);
    expect(rc?.defaultNoMeeting).toBe(true);
  });

  it('sets noMeeting default to false for CO Visit and Memorial', () => {
    const cov = SPECIAL_EVENT_PRESETS.find(p => p.key === 'circuit_overseer_visit');
    const mem = SPECIAL_EVENT_PRESETS.find(p => p.key === 'memorial');
    expect(cov?.defaultNoMeeting).toBe(false);
    expect(mem?.defaultNoMeeting).toBe(false);
  });

  it('resolves localized title and banner text according to languageMode', () => {
    const englishDetails = getSpecialEventPresetDetails('circuit_assembly', 'english');
    expect(englishDetails.title).toBe('Circuit Assembly');
    expect(englishDetails.noMeetingBanner).toBe("No Meeting at Kingdom Hall");

    const tagalogDetails = getSpecialEventPresetDetails('circuit_assembly', 'tagalog');
    expect(tagalogDetails.title).toBe('Sirkito Asembliya');
    expect(tagalogDetails.noMeetingBanner).toBe("Walang Pulong sa Kingdom Hall");

    const bothDetails = getSpecialEventPresetDetails('regional_convention', 'both');
    expect(bothDetails.title).toBe('Regional Convention / Rehiyonal na Kombensiyon');
    expect(bothDetails.noMeetingBanner).toBe("Walang Pulong sa Kingdom Hall • No Meeting at Kingdom Hall");
  });
});
