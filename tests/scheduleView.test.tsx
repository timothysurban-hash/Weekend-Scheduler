import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { ScheduleView } from '../components/ScheduleView';
import { DEFAULT_SETTINGS, INITIAL_OUTLINES } from '../constants';
import { Assignment, Speaker } from '../types';

describe('ScheduleView Component - Outline Selection', () => {
  const speakers: Speaker[] = [
    { id: 'sp1', name: 'John Doe', congregation: 'Central', isGuest: false, unavailableDates: [], lastAssigned: null, sortOrder: 1, spiritualStatus: 'elder' },
    { id: 'sp2', name: 'James Smith', congregation: 'Central', isGuest: false, unavailableDates: [], lastAssigned: null, sortOrder: 2, spiritualStatus: 'ms' }
  ];

  const now = new Date();
  const currentMonthDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-15`;

  const assignments: Assignment[] = [
    {
      id: 'a1',
      date: currentMonthDate,
      speakerId: 'sp1',
      outlineId: 1,
      chairmanId: 'sp1',
      conductorId: 'sp1',
      readerId: 'sp2',
      entranceAttendantId: 'sp2',
      auditoriumAttendantId: 'sp2',
      micServerIds: ['sp2'],
      locked: false,
      speakerLocked: false
    }
  ];

  it('renders outline CustomSelect and special talk title input below speaker buttons', () => {
    const unassignedOutline: Assignment[] = [
      {
        ...assignments[0],
        id: 'a2',
        outlineId: null,
        customTalkTitle: ''
      }
    ];

    const html = renderToString(
      <ScheduleView
        assignments={unassignedOutline}
        speakers={speakers}
        outlines={INITIAL_OUTLINES}
        settings={DEFAULT_SETTINGS}
        updateAssignments={() => {}}
        updateSpeakers={() => {}}
      />
    );

    // Verify Speaker section has speaker button, unassigned outline placeholder, and special talk title input
    expect(html).toContain('Add Guest Speaker');
    expect(html).toContain('Select Outline...');
    expect(html).toContain('Or Special Talk Title...');
  });

  it('renders all duty roles in mobile duty roster card', () => {
    const html = renderToString(
      <ScheduleView
        assignments={assignments}
        speakers={speakers}
        outlines={INITIAL_OUTLINES}
        settings={DEFAULT_SETTINGS}
        updateAssignments={() => {}}
        updateSpeakers={() => {}}
      />
    );

    // Verify all duty roles are rendered
    expect(html).toContain('Chairman');
    expect(html).toContain('WT Conductor');
    expect(html).toContain('WT Reader');
    expect(html).toContain('Entrance Attendant');
    expect(html).toContain('Auditorium Attendant');
    expect(html).toContain('Mic Server 1');
    expect(html).toContain('Mic Server 2');
  });

  it('renders mobile cards with full opacity (no opacity-0 stuck on active items)', () => {
    const html = renderToString(
      <ScheduleView
        assignments={assignments}
        speakers={speakers}
        outlines={INITIAL_OUTLINES}
        settings={DEFAULT_SETTINGS}
        updateAssignments={() => {}}
        updateSpeakers={() => {}}
      />
    );

    // Ensure active mobile cards are not stuck with opacity-0
    expect(html).not.toContain('animate-enter-slide opacity-0');
  });

  it('renders clear separation with week index and prominent date header on mobile cards', () => {
    const html = renderToString(
      <ScheduleView
        assignments={assignments}
        speakers={speakers}
        outlines={INITIAL_OUTLINES}
        settings={DEFAULT_SETTINGS}
        updateAssignments={() => {}}
        updateSpeakers={() => {}}
      />
    );

    // Verify distinct week header banner
    expect(html).toContain('Week 1 of');
    expect(html).toContain('Chairman');
  });

  it('renders selected outline when outlineId is present', () => {
    const html = renderToString(
      <ScheduleView
        assignments={assignments}
        speakers={speakers}
        outlines={INITIAL_OUTLINES}
        settings={DEFAULT_SETTINGS}
        updateAssignments={() => {}}
        updateSpeakers={() => {}}
      />
    );

    expect(html).toContain('#1 - Gaano Mo Kakilala ang Diyos?');
    expect(html).toContain('Or Special Talk Title...');
  });
});
