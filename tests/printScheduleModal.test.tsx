import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import React from 'react';
import { PrintScheduleModal } from '../components/PrintScheduleModal';
import { Assignment, Speaker, Outline, AppSettings } from '../types';
import { DEFAULT_SETTINGS } from '../constants';

describe('PrintScheduleModal Component (TDD)', () => {
  const speakers: Speaker[] = [
    { id: 'b1', name: 'John Doe', congregation: 'Green Heights', isGuest: false, unavailableDates: [], lastAssigned: null, sortOrder: 1 },
    { id: 'b2', name: 'James Smith', congregation: 'Green Heights', isGuest: false, unavailableDates: [], lastAssigned: null, sortOrder: 2 }
  ];

  const outlines: Outline[] = [
    { id: 101, title: 'Making a Good Name With God', lastUsed: null, lastSpeakerId: null, lastCongregation: null }
  ];

  const settings: AppSettings = {
    ...DEFAULT_SETTINGS,
    congregationName: 'Green Heights',
    locationName: 'Tayabas City',
    meetingTime: 'SUNDAY 3:00 P.M.'
  };

  const septemberAssignments: Assignment[] = [
    { id: 'a1', date: '2026-09-06', speakerId: 'b1', outlineId: 101, chairmanId: 'b2', locked: false },
    { id: 'a2', date: '2026-09-13', speakerId: 'b2', outlineId: 101, chairmanId: 'b1', locked: false },
    { id: 'a3', date: '2026-09-20', speakerId: 'b1', outlineId: 101, chairmanId: 'b2', locked: false },
    { id: 'a4', date: '2026-09-27', speakerId: 'b2', outlineId: 101, chairmanId: 'b1', locked: false }
  ];

  it('renders multi-page sheets with 3 weeks on page 1 and remaining week on page 2 for a 4-week month', () => {
    const html = renderToString(
      <PrintScheduleModal
        assignments={septemberAssignments}
        speakers={speakers}
        outlines={outlines}
        settings={settings}
        viewDate={new Date('2026-09-01')}
        onClose={() => {}}
      />
    );

    // Header rendered on each printed sheet
    expect(html).toContain('Green Heights Congregation — Tayabas City');
    expect(html).toContain('ARRANGEMENT FOR WEEKEND MEETING');
    expect(html).toContain('SUNDAY 3:00 P.M.');

    // Dates
    expect(html).toContain('SETYEMBRE 6');
    expect(html).toContain('SETYEMBRE 13');
    expect(html).toContain('SETYEMBRE 20');
    expect(html).toContain('SETYEMBRE 27');

    // Batch selector buttons for 4-week month
    expect(html).toContain('All (3/page)');
    expect(html).toContain('Weeks 1–3');
    expect(html).toContain('Week 4');

    // Print class hooks for scrollbar removal and pagination
    expect(html).toContain('print-modal-backdrop');
    expect(html).toContain('print-page-sheet');
    expect(html).toContain('print-page-break');
  });

  it('renders single sheet without batch selector buttons when month has <= 3 assignments', () => {
    const threeAssignments = septemberAssignments.slice(0, 3);
    const html = renderToString(
      <PrintScheduleModal
        assignments={threeAssignments}
        speakers={speakers}
        outlines={outlines}
        settings={settings}
        viewDate={new Date('2026-09-01')}
        onClose={() => {}}
      />
    );

    expect(html).toContain('SETYEMBRE 6');
    expect(html).toContain('SETYEMBRE 13');
    expect(html).toContain('SETYEMBRE 20');
    expect(html).not.toContain('SETYEMBRE 27');
    // No batch selector needed when all fit in 1 sheet
    expect(html).not.toContain('All (3/page)');
  });

  it('ensures background app (#root) is suppressed in print media stylesheet', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const indexHtml = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf-8');

    // Verify print media styles hide #root / non-modal elements
    expect(indexHtml).toMatch(/@media print\s*\{[\s\S]*#root\s*\{[^}]*display:\s*none\s*!important/);
    expect(indexHtml).toMatch(/@media print\s*\{[\s\S]*body\s*>\s*\*:not\(\.print-modal-backdrop\)\s*\{[^}]*display:\s*none\s*!important/);
  });

  it('renders Speaker and Tema with #2A080D highlight color, bold font, and bold duty labels', () => {
    const html = renderToString(
      <PrintScheduleModal
        assignments={septemberAssignments.slice(0, 1)}
        speakers={speakers}
        outlines={outlines}
        settings={settings}
        viewDate={new Date('2026-09-01')}
        onClose={() => {}}
      />
    );

    // #2A080D highlight colors on speaker and tema
    expect(html).toContain('text-[#2A080D]');
    expect(html).toContain('border-[#2A080D]');
    expect(html).toContain('Making a Good Name With God');
    
    // Bold labels
    expect(html).toContain('Entrance Attendant');
    expect(html).toContain('font-bold');
    
    // Distinct alternating row background tint
    expect(html).toContain('bg-[#f9ecef]');

    // Vertical alignment on Microphone Servers
    expect(html).toContain('align-middle');
  });
});
