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

  it('renders all 4 weeks on 1 single page sheet for a 4-week month without page break buttons', () => {
    const html = renderToString(
      <PrintScheduleModal
        assignments={septemberAssignments}
        speakers={speakers}
        outlines={outlines}
        settings={settings}
        viewDate={new Date('2026-09-01')}
        initialStartDate="2026-09-06"
        initialEndDate="2026-09-27"
        onClose={() => {}}
      />
    );

    // Header rendered on printed sheet
    expect(html).toContain('Green Heights Congregation — Tayabas City');
    expect(html).toContain('ARRANGEMENT FOR WEEKEND MEETING');
    expect(html).toContain('SUNDAY 3:00 P.M.');

    // Dates
    expect(html).toContain('SETYEMBRE 6');
    expect(html).toContain('SETYEMBRE 13');
    expect(html).toContain('SETYEMBRE 20');
    expect(html).toContain('SETYEMBRE 27');
    expect(html).toContain('4 meetings selected');

    // 4 weeks fit on 1 sheet, so no multi-page batch selector needed
    expect(html).not.toContain('All (4/page)');

    // Print and Save as Image actions in control bar
    expect(html).toContain('Print Schedule');
    expect(html).toContain('Save as Image');

    // Print class hooks
    expect(html).toContain('print-modal-backdrop');
    expect(html).toContain('print-page-sheet');
  });

  it('renders multi-page sheets with 4 weeks on page 1 and remaining week on page 2 for a 5-week month', () => {
    const fiveWeekAssignments: Assignment[] = [
      ...septemberAssignments,
      { id: 'a5', date: '2026-10-04', speakerId: 'b1', outlineId: 101, chairmanId: 'b2', locked: false }
    ];

    const html = renderToString(
      <PrintScheduleModal
        assignments={fiveWeekAssignments}
        speakers={speakers}
        outlines={outlines}
        settings={settings}
        viewDate={new Date('2026-09-01')}
        initialStartDate="2026-09-06"
        initialEndDate="2026-10-04"
        onClose={() => {}}
      />
    );

    // Batch selector buttons for 5-week range
    expect(html).toContain('All (4/page)');
    expect(html).toContain('Weeks 1–4');
    expect(html).toContain('Week 5');
    expect(html).toContain('print-page-break');
  });

  it('defaults From to week 1 and To to week 4 of the month, fitting 4 weeks on 1 single page', () => {
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

    expect(html).toContain('SETYEMBRE 6');
    expect(html).toContain('SETYEMBRE 13');
    expect(html).toContain('SETYEMBRE 20');
    expect(html).toContain('SETYEMBRE 27');
    expect(html).toContain('4 meetings selected');
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
    expect(html).toContain('border-[1.5px]');
    expect(html).toContain('border-[#EEDCDA]');
    expect(html).toContain('text-[13.5px]');
    expect(html).toContain('Making a Good Name With God');
    
    // Bold labels
    expect(html).toContain('Entrance Attendant');
    expect(html).toContain('font-bold');
    
    // Distinct alternating row background tint
    expect(html).toContain('bg-[#F9EEED]');

    // Vertical alignment on Microphone Servers
    expect(html).toContain('align-middle');
  });

  it('renders cross-month date range (e.g. Sept 27 to Oct 11) fitting exactly 3 weeks on a single printed sheet', () => {
    const crossMonthAssignments: Assignment[] = [
      { id: 'a4', date: '2026-09-27', speakerId: 'b1', outlineId: 101, chairmanId: 'b2', locked: false },
      { id: 'o1', date: '2026-10-04', speakerId: 'b2', outlineId: 101, chairmanId: 'b1', locked: false },
      { id: 'o2', date: '2026-10-11', speakerId: 'b1', outlineId: 101, chairmanId: 'b2', locked: false },
      { id: 'o3', date: '2026-10-18', speakerId: 'b2', outlineId: 101, chairmanId: 'b1', locked: false }
    ];

    const html = renderToString(
      <PrintScheduleModal
        assignments={crossMonthAssignments}
        speakers={speakers}
        outlines={outlines}
        settings={settings}
        viewDate={new Date('2026-09-01')}
        initialStartDate="2026-09-27"
        initialEndDate="2026-10-11"
        onClose={() => {}}
      />
    );

    // Cross-month dates rendered on the single 3-week sheet
    expect(html).toContain('SETYEMBRE 27');
    expect(html).toContain('OKTUBRE 4');
    expect(html).toContain('OKTUBRE 11');
    expect(html).toContain('3 meetings selected');

    // Date range controls in print header
    expect(html).toContain('From:');
    expect(html).toContain('To:');
  });

  it('restricts From dropdown to strictly the viewed month, and To dropdown to start at week 3 onwards (excluding weeks 1 and 2)', () => {
    const multiMonthAssignments: Assignment[] = [
      { id: 's1', date: '2026-09-06', speakerId: 'b2', outlineId: 101, chairmanId: 'b1', locked: false },
      { id: 's2', date: '2026-09-13', speakerId: 'b1', outlineId: 101, chairmanId: 'b2', locked: false },
      { id: 's3', date: '2026-09-20', speakerId: 'b2', outlineId: 101, chairmanId: 'b1', locked: false },
      { id: 's4', date: '2026-09-27', speakerId: 'b1', outlineId: 101, chairmanId: 'b2', locked: false },
      { id: 'o1', date: '2026-10-04', speakerId: 'b2', outlineId: 101, chairmanId: 'b1', locked: false },
      { id: 'o2', date: '2026-10-11', speakerId: 'b1', outlineId: 101, chairmanId: 'b2', locked: false }
    ];

    const html = renderToString(
      <PrintScheduleModal
        assignments={multiMonthAssignments}
        speakers={speakers}
        outlines={outlines}
        settings={settings}
        viewDate={new Date('2026-09-01')}
        onClose={() => {}}
      />
    );

    // Initial render defaults From to Sept 6 (Week 1) and To to Sept 20 (Week 3)
    expect(html).toContain('From:');
    expect(html).toContain('SETYEMBRE 6');
    expect(html).toContain('To:');
    expect(html).toContain('SETYEMBRE 20');
  });

  it('renders prominent centered event notice card for No Meeting special weeks', () => {
    const assignmentsWithSpecial: Assignment[] = [
      {
        id: 'sp-print-1',
        date: '2026-11-29',
        speakerId: null,
        outlineId: null,
        locked: false,
        isSpecialEvent: true,
        specialEventType: 'regional_convention',
        specialEventTitle: 'Regional Convention',
        noMeeting: true,
      }
    ];

    const html = renderToString(
      <PrintScheduleModal
        assignments={assignmentsWithSpecial}
        speakers={speakers}
        outlines={outlines}
        settings={{ ...settings, languageMode: 'both' }}
        viewDate={new Date('2026-11-01')}
        initialStartDate="2026-11-29"
        initialEndDate="2026-11-29"
        onClose={() => {}}
      />
    );

    expect(html).toContain('Regional Convention');
    expect(html).toContain('Walang Pulong sa Kingdom Hall');
    expect(html).toContain('border-2 border-[#2A080D]');
    expect(html).toContain('text-amber-200');
  });
});

