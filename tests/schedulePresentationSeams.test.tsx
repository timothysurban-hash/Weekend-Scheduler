import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import React from 'react';
import { ScheduleDesktopRow } from '../components/schedule/ScheduleDesktopRow';
import { ScheduleMobileCard } from '../components/schedule/ScheduleMobileCard';
import { MonthNavigationControl } from '../components/schedule/MonthNavigationControl';
import { ScheduleHeroCard } from '../components/schedule/ScheduleHeroCard';
import { INITIAL_OUTLINES } from '../constants';
import { Assignment, Speaker } from '../types';

describe('Schedule Presentation Seams (TDD)', () => {
  const speakers: Speaker[] = [
    { id: 'sp1', name: 'John Doe', congregation: 'Central', isGuest: false, unavailableDates: [], lastAssigned: null, sortOrder: 1, spiritualStatus: 'elder' },
    { id: 'sp2', name: 'James Smith', congregation: 'Central', isGuest: false, unavailableDates: [], lastAssigned: null, sortOrder: 2, spiritualStatus: 'ms' }
  ];

  const assignment: Assignment = {
    id: 'a1',
    date: '2026-08-30',
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
  };

  describe('ScheduleDesktopRow', () => {
    it('renders desktop table row with all duty roles and outline selector', () => {
      const html = renderToString(
        <table>
          <tbody>
            <ScheduleDesktopRow
              assignment={assignment}
              speakers={speakers}
              outlines={INITIAL_OUTLINES}
              visibleRoles={['chairman', 'conductor', 'reader', 'speaker', 'attendants', 'mic']}
              isThisWeek={true}
              isJustFilled={false}
              isExiting={false}
              onAssignmentChange={() => {}}
              onSpeakerChange={() => {}}
              onLockToggle={() => {}}
              onSpeakerLockToggle={() => {}}
              onAddGuest={() => {}}
              onDeleteAssignment={() => {}}
            />
          </tbody>
        </table>
      );

      expect(html).toContain('John Doe');
      expect(html).toContain('James Smith');
      expect(html).toContain('THIS WEEK');
    });

    it('renders merged banner row when assignment is a No Meeting special week', () => {
      const specialAssignment: Assignment = {
        id: 'test-sa',
        date: '2026-11-22',
        speakerId: null,
        outlineId: null,
        locked: false,
        isSpecialEvent: true,
        specialEventType: 'circuit_assembly',
        specialEventTitle: 'Circuit Assembly with Circuit Overseer',
        noMeeting: true,
      };

      const html = renderToString(
        <table>
          <tbody>
            <ScheduleDesktopRow
              assignment={specialAssignment}
              speakers={[]}
              outlines={INITIAL_OUTLINES}
              visibleRoles={['chairman', 'conductor', 'reader', 'speaker', 'attendants', 'mic']}
              isThisWeek={false}
              onAssignmentChange={() => {}}
              onSpeakerChange={() => {}}
              onLockToggle={() => {}}
              onSpeakerLockToggle={() => {}}
              onAddGuest={() => {}}
              onOpenSpecialWeek={() => {}}
            />
          </tbody>
        </table>
      );

      expect(html).toContain('Circuit Assembly with Circuit Overseer');
      expect(html).toContain('No Meeting at Kingdom Hall');
    });
  });

  describe('ScheduleMobileCard', () => {
    it('renders mobile schedule card with prominent header and week index', () => {
      const html = renderToString(
        <ScheduleMobileCard
          assignment={assignment}
          speakers={speakers}
          outlines={INITIAL_OUTLINES}
          index={0}
          totalWeeks={4}
          roleFilter="all"
          isThisWeek={true}
          isJustFilled={false}
          isExiting={false}
          onAssignmentChange={() => {}}
          onSpeakerChange={() => {}}
          onLockToggle={() => {}}
          onSpeakerLockToggle={() => {}}
          onAddGuest={() => {}}
          onCopyNames={() => {}}
        />
      );

      expect(html).toContain('Week 1 of 4');
      expect(html).toContain('John Doe');
      expect(html).toContain('This Week');
    });
  });

  describe('MonthNavigationControl', () => {
    it('renders month navigator with role cluster tabs and action triggers', () => {
      const html = renderToString(
        <MonthNavigationControl
          viewDate={new Date('2026-08-01')}
          onPrevMonth={() => {}}
          onNextMonth={() => {}}
          onToday={() => {}}
          roleFilter="all"
          onRoleFilterChange={() => {}}
          visibleRoles={['chairman', 'conductor', 'reader', 'speaker', 'attendants', 'mic']}
          onToggleVisibleRole={() => {}}
          onExportCsv={() => {}}
          onExportJson={() => {}}
          onExportIcs={() => {}}
          onOpenPrintModal={() => {}}
          onClearMonth={() => {}}
          onOpenGuide={() => {}}
          onAutoRotateMonth={() => {}}
          onFillAssignments={() => {}}
          hasUnlockedAssignments={true}
        />
      );

      expect(html).toContain('August 2026');
      expect(html).toContain('Today');
      expect(html).toContain('All Roles');
    });
  });

  describe('ScheduleHeroCard', () => {
    it('renders summary metrics and quick action controls', () => {
      const html = renderToString(
        <ScheduleHeroCard
          viewDate={new Date('2026-08-01')}
          displayedAssignments={[assignment]}
          speakers={speakers}
          onAutoRotateMonth={() => {}}
          onFillAssignments={() => {}}
          onClearMonth={() => {}}
          onOpenGuide={() => {}}
          hasUnlockedAssignments={true}
        />
      );

      expect(html).toContain('Auto-Rotate');
      expect(html).toContain('Clear Month');
    });
  });
});
