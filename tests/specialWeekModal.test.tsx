import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { SpecialWeekModal } from '../components/schedule/SpecialWeekModal';
import { Assignment } from '../types';

describe('SpecialWeekModal', () => {
  const dummyAssignment: Assignment = {
    id: 'test-1',
    date: '2026-11-15',
    speakerId: null,
    outlineId: null,
    locked: false,
  };

  it('renders modal with preset options when open', () => {
    const html = renderToString(
      <SpecialWeekModal
        isOpen={true}
        assignment={dummyAssignment}
        languageMode="english"
        onClose={vi.fn()}
        onSave={vi.fn()}
        onRevert={vi.fn()}
      />
    );

    expect(html).toContain('Configure Special Week');
    expect(html).toContain('Circuit Assembly');
    expect(html).toContain('Regional Convention');
    expect(html).toContain('Circuit Overseer Visit');
    expect(html).toContain('Save Special Week');
  });

  it('renders revert button when assignment is currently special', () => {
    const specialAssignment: Assignment = {
      ...dummyAssignment,
      isSpecialEvent: true,
      specialEventType: 'regional_convention',
      specialEventTitle: 'Regional Convention',
      noMeeting: true,
    };

    const html = renderToString(
      <SpecialWeekModal
        isOpen={true}
        assignment={specialAssignment}
        languageMode="english"
        onClose={vi.fn()}
        onSave={vi.fn()}
        onRevert={vi.fn()}
      />
    );

    expect(html).toContain('Revert to Regular Meeting');
  });
});
