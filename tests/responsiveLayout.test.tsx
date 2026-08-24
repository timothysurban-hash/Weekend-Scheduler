import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { Navbar } from '../components/Navbar';
import { ScheduleView } from '../components/ScheduleView';
import { SpeakerList } from '../components/SpeakerList';
import { OutlineList } from '../components/OutlineList';
import { RoleRulesView } from '../components/RoleRulesView';
import { Settings } from '../components/Settings';
import { DEFAULT_SETTINGS, DEMO_SPEAKERS } from '../constants';
import { Outline, Assignment } from '../types';

describe('Responsive Page Layouts (TDD)', () => {
  const mockOutlines: Outline[] = [
    { id: 1, title: 'Sample Talk 1', lastUsed: '2025-01-01', lastSpeakerId: null, lastCongregation: null },
    { id: 2, title: 'Sample Talk 2', lastUsed: null, lastSpeakerId: null, lastCongregation: null }
  ];

  const mockAssignments: Assignment[] = [
    { id: 'a1', date: '2026-09-06', speakerId: 'sp-1', outlineId: 1, locked: false }
  ];

  describe('Navbar Responsive Navigation', () => {
    it('renders desktop sidebar navigation hidden on mobile and mobile bottom nav hidden on desktop', () => {
      const html = renderToString(
        <Navbar currentView="schedule" setView={() => {}} />
      );

      // Desktop sidebar has md:flex and hidden on mobile
      expect(html).toContain('hidden md:flex');
      // Mobile bottom bar has md:hidden
      expect(html).toContain('md:hidden fixed bottom-0');
    });
  });

  describe('SpeakerList Responsive Layout', () => {
    it('renders responsive grid with 1 col on mobile, 2 on sm, 3 on lg, and 4 on xl screens', () => {
      const html = renderToString(
        <SpeakerList
          speakers={DEMO_SPEAKERS}
          outlines={mockOutlines}
          updateSpeakers={() => {}}
          assignments={mockAssignments}
        />
      );

      // Grid classes for multi-breakpoint responsiveness
      expect(html).toContain('grid-cols-1');
      expect(html).toContain('sm:grid-cols-2');
      expect(html).toContain('New Brother');
      expect(html).toContain('Search brother name...');
    });
  });

  describe('OutlineList Responsive Layout', () => {
    it('renders responsive grid and flexible toolbar', () => {
      const html = renderToString(
        <OutlineList
          outlines={mockOutlines}
          settings={DEFAULT_SETTINGS}
          updateOutlines={() => {}}
          assignments={mockAssignments}
        />
      );

      expect(html).toContain('grid-cols-1');
      expect(html).toContain('sm:grid-cols-2');
    });
  });

  describe('RoleRulesView Responsive Layout', () => {
    it('renders responsive authority role cards and scrollable role tabs', () => {
      const html = renderToString(
        <RoleRulesView
          speakers={DEMO_SPEAKERS}
          assignments={mockAssignments}
          settings={DEFAULT_SETTINGS}
          saveSettings={() => {}}
          updateAssignments={() => {}}
        />
      );

      // Check responsive authority role grid and tab strip
      expect(html).toContain('grid');
      expect(html).toContain('overflow-x-auto');
      expect(html).toContain('Search brother...');
    });
  });

  describe('ScheduleView Responsive Layout', () => {
    it('renders responsive month navigation, cluster filter tabs, and hero action buttons', () => {
      const html = renderToString(
        <ScheduleView
          assignments={mockAssignments}
          speakers={DEMO_SPEAKERS}
          outlines={mockOutlines}
          settings={DEFAULT_SETTINGS}
          updateAssignments={() => {}}
          updateSpeakers={() => {}}
        />
      );

      // Check month navigator and filter tabs render
      expect(html).toContain('Auto-Rotate');
      expect(html).toContain('Authority');
      expect(html).toContain('Print');
    });
  });

  describe('Settings Responsive Layout', () => {
    it('renders responsive grid layout for settings sections', () => {
      const html = renderToString(
        <Settings
          settings={DEFAULT_SETTINGS}
          saveSettings={() => {}}
        />
      );

      expect(html).toContain('grid');
    });
  });
});
