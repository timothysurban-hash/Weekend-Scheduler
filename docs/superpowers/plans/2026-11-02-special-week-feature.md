# Special Week Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a comprehensive Special Week feature supporting Circuit Assemblies, Regional Conventions, Circuit Overseer Visits, Memorial, Special Talks, and Custom events with smart duty suspension/preservation, dashboard merged-row presentation, and publication-ready print layout rendering.

**Architecture:** Extend domain types with `SpecialEventType` and `SuspendedDuties`, add domain utility `specialWeekHelper.ts` for clean state transitions, integrate with `scheduleEngine` and `scheduleCoordinator` to respect `noMeeting` duty suspension, build a reusable `SpecialWeekModal` component, update desktop and mobile schedule views to display special week badges and merged banner rows, and update `PrintScheduleModal` to render high-contrast notice cards for "No Meeting" events.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Vitest.

## Global Constraints

- Follow established deep module and presentation seam architectural boundaries (`CONTEXT.md`).
- Preserve all existing comments and docstrings.
- Fully type-safe with TypeScript (`npm test` and `npm run build` must succeed).
- No placeholder code or skipped edge cases.

---

### Task 1: Domain Types, Constants, and Presets for Special Week

**Files:**
- Modify: `types.ts`
- Modify: `constants.ts`
- Test: `tests/specialWeekPresets.test.ts`

**Interfaces:**
- Consumes: `Assignment` in `types.ts`.
- Produces:
  - `SpecialEventType` type in `types.ts`.
  - `SuspendedDuties` interface in `types.ts`.
  - Updated `Assignment` interface with `specialEventType`, `noMeeting`, and `suspendedDuties`.
  - `SPECIAL_EVENT_PRESETS` and `getSpecialEventPresetDetails` in `constants.ts`.

- [ ] **Step 1: Write the failing test**

Create `tests/specialWeekPresets.test.ts`:
```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/specialWeekPresets.test.ts`
Expected: FAIL due to missing `SPECIAL_EVENT_PRESETS` and `getSpecialEventPresetDetails`.

- [ ] **Step 3: Update `types.ts` and `constants.ts`**

In `types.ts`, add:
```typescript
export type SpecialEventType = 
  | 'circuit_assembly'
  | 'regional_convention'
  | 'circuit_overseer_visit'
  | 'memorial'
  | 'special_talk'
  | 'custom';

export interface SuspendedDuties {
  speakerId?: string | null;
  outlineId?: number | null;
  customTalkTitle?: string;
  chairmanId?: string | null;
  conductorId?: string | null;
  readerId?: string | null;
  entranceAttendantId?: string | null;
  auditoriumAttendantId?: string | null;
  micServerIds?: string[];
  customDutyAssignments?: Record<string, string[]>;
}
```
And update `Assignment` in `types.ts`:
```typescript
export interface Assignment {
  id: string;
  date: string; // ISO Date string (YYYY-MM-DD)
  speakerId: string | null;
  outlineId: number | null;
  entranceAttendantId?: string | null;
  auditoriumAttendantId?: string | null;
  chairmanId?: string | null;
  conductorId?: string | null;
  readerId?: string | null;
  micServerIds?: string[]; // Array of 1 or 2 brother IDs
  isSpecialEvent?: boolean; // Assembly / Convention flag
  specialEventType?: SpecialEventType;
  specialEventTitle?: string;
  noMeeting?: boolean;
  suspendedDuties?: SuspendedDuties;
  locked: boolean;
  speakerLocked?: boolean;
  note?: string;
  hostSpeakerId?: string | null;
  customTalkTitle?: string;
  customDutyAssignments?: Record<string, string[]>; // Dynamic roleId -> array of brother IDs
}
```

In `constants.ts`, add:
```typescript
export interface SpecialEventPresetConfig {
  key: SpecialEventType;
  englishTitle: string;
  tagalogTitle: string;
  defaultNoMeeting: boolean;
}

export const SPECIAL_EVENT_PRESETS: SpecialEventPresetConfig[] = [
  {
    key: 'circuit_assembly',
    englishTitle: 'Circuit Assembly',
    tagalogTitle: 'Sirkito Asembliya',
    defaultNoMeeting: true,
  },
  {
    key: 'regional_convention',
    englishTitle: 'Regional Convention',
    tagalogTitle: 'Rehiyonal na Kombensiyon',
    defaultNoMeeting: true,
  },
  {
    key: 'circuit_overseer_visit',
    englishTitle: 'Circuit Overseer Visit',
    tagalogTitle: 'Dalaw ng Tagapangasiwa ng Sirkito',
    defaultNoMeeting: false,
  },
  {
    key: 'memorial',
    englishTitle: 'Memorial',
    tagalogTitle: 'Memoryal',
    defaultNoMeeting: false,
  },
  {
    key: 'special_talk',
    englishTitle: 'Special Talk',
    tagalogTitle: 'Espesyal na Pahayag',
    defaultNoMeeting: false,
  },
  {
    key: 'custom',
    englishTitle: 'Custom Event',
    tagalogTitle: 'Natatanging Kaganapan',
    defaultNoMeeting: false,
  },
];

export const getSpecialEventPresetDetails = (
  type: SpecialEventType,
  languageMode: 'english' | 'tagalog' | 'both' = 'english'
): { title: string; noMeetingBanner: string } => {
  const preset = SPECIAL_EVENT_PRESETS.find(p => p.key === type);
  const englishTitle = preset?.englishTitle || 'Special Event';
  const tagalogTitle = preset?.tagalogTitle || 'Natatanging Kaganapan';

  let title = englishTitle;
  if (languageMode === 'tagalog') {
    title = tagalogTitle;
  } else if (languageMode === 'both') {
    title = `${englishTitle} / ${tagalogTitle}`;
  }

  let noMeetingBanner = "No Meeting at Kingdom Hall";
  if (languageMode === 'tagalog') {
    noMeetingBanner = "Walang Pulong sa Kingdom Hall";
  } else if (languageMode === 'both') {
    noMeetingBanner = "Walang Pulong sa Kingdom Hall • No Meeting at Kingdom Hall";
  }

  return { title, noMeetingBanner };
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/specialWeekPresets.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add types.ts constants.ts tests/specialWeekPresets.test.ts
git commit -m "feat(domain): add special week types, presets, and localization helpers"
```

---

### Task 2: State Transitions & Engine Integration

**Files:**
- Create: `domain/specialWeekHelper.ts`
- Modify: `domain/scheduleEngine.ts`
- Modify: `domain/scheduleCoordinator.ts`
- Test: `tests/specialWeekHelper.test.ts`

**Interfaces:**
- Consumes: `Assignment`, `SpecialEventType`, `SuspendedDuties` from `types.ts`.
- Produces:
  - `setAssignmentSpecialEvent(assignment: Assignment, options: SetSpecialEventOptions): Assignment` in `domain/specialWeekHelper.ts`.
  - `revertAssignmentSpecialEvent(assignment: Assignment): Assignment` in `domain/specialWeekHelper.ts`.
  - Updated `autoRotateMonth` and `applyAuthorityRoles` in `domain/scheduleEngine.ts` to respect `noMeeting`.

- [ ] **Step 1: Write the failing test**

Create `tests/specialWeekHelper.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { setAssignmentSpecialEvent, revertAssignmentSpecialEvent } from '../domain/specialWeekHelper';
import { Assignment } from '../types';

describe('specialWeekHelper', () => {
  const initialAssignment: Assignment = {
    id: 'assign-1',
    date: '2026-11-08',
    speakerId: 'spk-1',
    outlineId: 45,
    customTalkTitle: 'Original Talk',
    chairmanId: 'bro-1',
    conductorId: 'bro-2',
    readerId: 'bro-3',
    entranceAttendantId: 'bro-4',
    auditoriumAttendantId: 'bro-5',
    micServerIds: ['bro-6', 'bro-7'],
    locked: false,
  };

  it('suspends duties and clears active fields when noMeeting is true', () => {
    const updated = setAssignmentSpecialEvent(initialAssignment, {
      isSpecialEvent: true,
      specialEventType: 'circuit_assembly',
      specialEventTitle: 'Circuit Assembly with Circuit Overseer',
      noMeeting: true,
    });

    expect(updated.isSpecialEvent).toBe(true);
    expect(updated.specialEventType).toBe('circuit_assembly');
    expect(updated.specialEventTitle).toBe('Circuit Assembly with Circuit Overseer');
    expect(updated.noMeeting).toBe(true);

    // Active duties cleared
    expect(updated.speakerId).toBeNull();
    expect(updated.chairmanId).toBeNull();
    expect(updated.conductorId).toBeNull();
    expect(updated.readerId).toBeNull();
    expect(updated.entranceAttendantId).toBeNull();
    expect(updated.auditoriumAttendantId).toBeNull();
    expect(updated.micServerIds).toEqual([]);

    // Suspended duties preserved
    expect(updated.suspendedDuties?.speakerId).toBe('spk-1');
    expect(updated.suspendedDuties?.chairmanId).toBe('bro-1');
    expect(updated.suspendedDuties?.micServerIds).toEqual(['bro-6', 'bro-7']);
  });

  it('restores suspended duties when reverting special week to normal meeting', () => {
    const special = setAssignmentSpecialEvent(initialAssignment, {
      isSpecialEvent: true,
      specialEventType: 'circuit_assembly',
      specialEventTitle: 'Circuit Assembly',
      noMeeting: true,
    });

    const reverted = revertAssignmentSpecialEvent(special);

    expect(reverted.isSpecialEvent).toBe(false);
    expect(reverted.specialEventType).toBeUndefined();
    expect(reverted.specialEventTitle).toBeUndefined();
    expect(reverted.noMeeting).toBe(false);
    expect(reverted.suspendedDuties).toBeUndefined();

    expect(reverted.speakerId).toBe('spk-1');
    expect(reverted.outlineId).toBe(45);
    expect(reverted.chairmanId).toBe('bro-1');
    expect(reverted.conductorId).toBe('bro-2');
    expect(reverted.micServerIds).toEqual(['bro-6', 'bro-7']);
  });

  it('keeps duties active when noMeeting is false (e.g. CO Visit)', () => {
    const updated = setAssignmentSpecialEvent(initialAssignment, {
      isSpecialEvent: true,
      specialEventType: 'circuit_overseer_visit',
      specialEventTitle: 'Circuit Overseer Visit',
      noMeeting: false,
      customTalkTitle: 'Service Talk by Circuit Overseer',
    });

    expect(updated.isSpecialEvent).toBe(true);
    expect(updated.specialEventType).toBe('circuit_overseer_visit');
    expect(updated.noMeeting).toBe(false);
    expect(updated.customTalkTitle).toBe('Service Talk by Circuit Overseer');

    // Duties remain active
    expect(updated.chairmanId).toBe('bro-1');
    expect(updated.conductorId).toBe('bro-2');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/specialWeekHelper.test.ts`
Expected: FAIL due to missing `domain/specialWeekHelper.ts`.

- [ ] **Step 3: Implement `domain/specialWeekHelper.ts` and update `scheduleEngine.ts`**

Create `domain/specialWeekHelper.ts`:
```typescript
import { Assignment, SpecialEventType, SuspendedDuties } from '../types';

export interface SetSpecialEventOptions {
  isSpecialEvent: boolean;
  specialEventType?: SpecialEventType;
  specialEventTitle?: string;
  noMeeting?: boolean;
  customTalkTitle?: string;
}

export const setAssignmentSpecialEvent = (
  assignment: Assignment,
  options: SetSpecialEventOptions
): Assignment => {
  if (!options.isSpecialEvent) {
    return revertAssignmentSpecialEvent(assignment);
  }

  if (options.noMeeting) {
    const suspended: SuspendedDuties = {
      speakerId: assignment.speakerId,
      outlineId: assignment.outlineId,
      customTalkTitle: assignment.customTalkTitle,
      chairmanId: assignment.chairmanId,
      conductorId: assignment.conductorId,
      readerId: assignment.readerId,
      entranceAttendantId: assignment.entranceAttendantId,
      auditoriumAttendantId: assignment.auditoriumAttendantId,
      micServerIds: assignment.micServerIds,
      customDutyAssignments: assignment.customDutyAssignments,
    };

    return {
      ...assignment,
      isSpecialEvent: true,
      specialEventType: options.specialEventType,
      specialEventTitle: options.specialEventTitle,
      noMeeting: true,
      suspendedDuties: assignment.suspendedDuties || suspended,
      speakerId: null,
      outlineId: null,
      customTalkTitle: undefined,
      chairmanId: null,
      conductorId: null,
      readerId: null,
      entranceAttendantId: null,
      auditoriumAttendantId: null,
      micServerIds: [],
      customDutyAssignments: {},
    };
  }

  return {
    ...assignment,
    isSpecialEvent: true,
    specialEventType: options.specialEventType,
    specialEventTitle: options.specialEventTitle,
    noMeeting: false,
    customTalkTitle: options.customTalkTitle !== undefined ? options.customTalkTitle : assignment.customTalkTitle,
  };
};

export const revertAssignmentSpecialEvent = (assignment: Assignment): Assignment => {
  const restored = assignment.suspendedDuties || {};
  return {
    ...assignment,
    isSpecialEvent: false,
    specialEventType: undefined,
    specialEventTitle: undefined,
    noMeeting: false,
    suspendedDuties: undefined,
    speakerId: restored.speakerId !== undefined ? restored.speakerId : assignment.speakerId,
    outlineId: restored.outlineId !== undefined ? restored.outlineId : assignment.outlineId,
    customTalkTitle: restored.customTalkTitle !== undefined ? restored.customTalkTitle : assignment.customTalkTitle,
    chairmanId: restored.chairmanId !== undefined ? restored.chairmanId : assignment.chairmanId,
    conductorId: restored.conductorId !== undefined ? restored.conductorId : assignment.conductorId,
    readerId: restored.readerId !== undefined ? restored.readerId : assignment.readerId,
    entranceAttendantId: restored.entranceAttendantId !== undefined ? restored.entranceAttendantId : assignment.entranceAttendantId,
    auditoriumAttendantId: restored.auditoriumAttendantId !== undefined ? restored.auditoriumAttendantId : assignment.auditoriumAttendantId,
    micServerIds: restored.micServerIds !== undefined ? restored.micServerIds : assignment.micServerIds,
    customDutyAssignments: restored.customDutyAssignments !== undefined ? restored.customDutyAssignments : assignment.customDutyAssignments,
  };
};
```

In `domain/scheduleEngine.ts`:
Update condition around line 160:
```typescript
    const isMeetingSuspended = a.isSpecialEvent && (a.noMeeting ?? true);
    if (aYear === year && aMonth === month && !a.locked && !isMeetingSuspended) {
```
And around line 224 in `applyAuthorityRoles`:
```typescript
    const isMeetingSuspended = a.isSpecialEvent && (a.noMeeting ?? true);
    if (aYear === year && aMonth === month && !a.locked && !isMeetingSuspended) {
```

In `domain/scheduleCoordinator.ts`:
Update conflict check so that assignments with `noMeeting === true` are excluded from double-booking collision checks.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/specialWeekHelper.test.ts tests/scheduleEngine.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add domain/specialWeekHelper.ts domain/scheduleEngine.ts domain/scheduleCoordinator.ts tests/specialWeekHelper.test.ts
git commit -m "feat(domain): implement special week state transitions and rotation handling"
```

---

### Task 3: SpecialWeekModal Component

**Files:**
- Create: `components/schedule/SpecialWeekModal.tsx`
- Test: `tests/specialWeekModal.test.tsx`

**Interfaces:**
- Consumes: `Assignment`, `SpecialEventType`, `AppSettings` from `types.ts`, `SPECIAL_EVENT_PRESETS`, `getSpecialEventPresetDetails` from `constants.ts`.
- Produces: `SpecialWeekModal` React component with props:
  - `isOpen: boolean`
  - `assignment: Assignment`
  - `languageMode?: 'english' | 'tagalog' | 'both'`
  - `onClose: () => void`
  - `onSave: (options: { isSpecialEvent: boolean; specialEventType?: SpecialEventType; specialEventTitle?: string; noMeeting?: boolean; customTalkTitle?: string }) => void`
  - `onRevert: () => void`

- [ ] **Step 1: Write the failing test**

Create `tests/specialWeekModal.test.tsx`:
```tsx
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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
    render(
      <SpecialWeekModal
        isOpen={true}
        assignment={dummyAssignment}
        languageMode="english"
        onClose={vi.fn()}
        onSave={vi.fn()}
        onRevert={vi.fn()}
      />
    );

    expect(screen.getByText(/Configure Special Week/i)).toBeDefined();
    expect(screen.getByText(/Circuit Assembly/i)).toBeDefined();
    expect(screen.getByText(/Regional Convention/i)).toBeDefined();
  });

  it('triggers onSave when selecting Circuit Assembly and submitting', () => {
    const handleSave = vi.fn();
    render(
      <SpecialWeekModal
        isOpen={true}
        assignment={dummyAssignment}
        languageMode="english"
        onClose={vi.fn()}
        onSave={handleSave}
        onRevert={vi.fn()}
      />
    );

    // Select circuit assembly preset button
    const caBtn = screen.getByRole('button', { name: /Circuit Assembly/i });
    fireEvent.click(caBtn);

    const saveBtn = screen.getByRole('button', { name: /Save Special Week/i });
    fireEvent.click(saveBtn);

    expect(handleSave).toHaveBeenCalledWith(expect.objectContaining({
      isSpecialEvent: true,
      specialEventType: 'circuit_assembly',
      noMeeting: true,
    }));
  });

  it('triggers onRevert when assignment is currently special and revert is clicked', () => {
    const handleRevert = vi.fn();
    const specialAssignment: Assignment = {
      ...dummyAssignment,
      isSpecialEvent: true,
      specialEventType: 'regional_convention',
      specialEventTitle: 'Regional Convention',
      noMeeting: true,
    };

    render(
      <SpecialWeekModal
        isOpen={true}
        assignment={specialAssignment}
        languageMode="english"
        onClose={vi.fn()}
        onSave={vi.fn()}
        onRevert={handleRevert}
      />
    );

    const revertBtn = screen.getByRole('button', { name: /Revert to Regular Meeting/i });
    fireEvent.click(revertBtn);

    expect(handleRevert).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/specialWeekModal.test.tsx`
Expected: FAIL due to missing `components/schedule/SpecialWeekModal.tsx`.

- [ ] **Step 3: Implement `components/schedule/SpecialWeekModal.tsx`**

Implement `SpecialWeekModal.tsx` using `Dialog`, `Button`, `Input`, `Icon`, with preset buttons, customizable title input, "No Meeting" toggle switch, and responsive layout.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/specialWeekModal.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/schedule/SpecialWeekModal.tsx tests/specialWeekModal.test.tsx
git commit -m "feat(ui): create SpecialWeekModal component"
```

---

### Task 4: Integrate Special Week into Desktop and Mobile Schedule Views

**Files:**
- Modify: `components/schedule/ScheduleDesktopRow.tsx`
- Modify: `components/schedule/ScheduleMobileCard.tsx`
- Modify: `components/ScheduleView.tsx`
- Test: `tests/schedulePresentationSeams.test.tsx`

**Interfaces:**
- Consumes: `SpecialWeekModal`, `setAssignmentSpecialEvent`, `revertAssignmentSpecialEvent`.
- Produces:
  - Special Week trigger pill in date column of `ScheduleDesktopRow`.
  - Merged banner row for `assignment.isSpecialEvent && (assignment.noMeeting ?? true)`.
  - Special Week trigger button in `ScheduleMobileCard` header.
  - Merged banner card for `assignment.isSpecialEvent && (assignment.noMeeting ?? true)`.
  - Modal state handler in `ScheduleView.tsx`.

- [ ] **Step 1: Write the failing test**

In `tests/schedulePresentationSeams.test.tsx`, add test:
```tsx
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

  render(
    <table>
      <tbody>
        <ScheduleDesktopRow
          assignment={specialAssignment}
          speakers={[]}
          outlines={[]}
          visibleRoles={['chairman', 'conductor', 'reader', 'speaker', 'attendants', 'mic']}
          isThisWeek={false}
          onAssignmentChange={vi.fn()}
          onSpeakerChange={vi.fn()}
          onLockToggle={vi.fn()}
          onSpeakerLockToggle={vi.fn()}
          onAddGuest={vi.fn()}
          onOpenSpecialWeek={vi.fn()}
        />
      </tbody>
    </table>
  );

  expect(screen.getByText(/Circuit Assembly with Circuit Overseer/i)).toBeDefined();
  expect(screen.getByText(/No Meeting at Kingdom Hall|Walang Pulong/i)).toBeDefined();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/schedulePresentationSeams.test.tsx`
Expected: FAIL due to missing merged banner row.

- [ ] **Step 3: Update `ScheduleDesktopRow.tsx`, `ScheduleMobileCard.tsx`, and `ScheduleView.tsx`**

- In `ScheduleDesktopRow.tsx`:
  - Add `onOpenSpecialWeek?: (assignment: Assignment) => void` to props.
  - In Date column, render special week badge / trigger button.
  - If `assignment.isSpecialEvent && (assignment.noMeeting ?? true)`:
    Render a single `td` with `colSpan={visibleRoleCount + 1}` containing the full-width notice banner:
    - Event icon (Sparkles / Calendar)
    - Bold event title
    - Subtitle ("No Meeting at Kingdom Hall")
    - "Edit Special Week" button triggering `onOpenSpecialWeek(assignment)`.
- In `ScheduleMobileCard.tsx`:
  - Add `onOpenSpecialWeek?: (assignment: Assignment) => void` to props.
  - Header has button to open special week modal.
  - Card body renders sleek event banner instead of empty roster when `noMeeting` is true.
- In `ScheduleView.tsx`:
  - Add state `activeSpecialWeekAssignment: Assignment | null`.
  - Pass `onOpenSpecialWeek` to `ScheduleDesktopRow` and `ScheduleMobileCard`.
  - Mount `<SpecialWeekModal />` connected to `setAssignmentSpecialEvent` and `revertAssignmentSpecialEvent`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/schedulePresentationSeams.test.tsx tests/scheduleView.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/schedule/ScheduleDesktopRow.tsx components/schedule/ScheduleMobileCard.tsx components/ScheduleView.tsx tests/schedulePresentationSeams.test.tsx
git commit -m "feat(ui): integrate special week banner and modal into schedule views"
```

---

### Task 5: Publication Print Layout Notice Card for Special Weeks

**Files:**
- Modify: `components/PrintScheduleModal.tsx`
- Modify: `domain/scheduleFormatter.ts`
- Test: `tests/printScheduleModal.test.tsx`
- Test: `tests/scheduleFormatter.test.ts`

**Interfaces:**
- Consumes: `assignment.isSpecialEvent`, `assignment.noMeeting`, `assignment.specialEventTitle`.
- Produces:
  - Centered publication-quality notice card inside `PrintScheduleModal.tsx` when `noMeeting` is true.
  - Formatted clipboard text in `formatBrotherNamesForClipboard` reflecting special event notice.

- [ ] **Step 1: Write the failing test**

In `tests/printScheduleModal.test.tsx`, add test:
```tsx
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

  render(
    <PrintScheduleModal
      isOpen={true}
      onClose={vi.fn()}
      assignments={assignmentsWithSpecial}
      speakers={[]}
      outlines={[]}
      settings={{ congregationName: 'Central', cooldownMonths: 2, maxMonthlyDutiesPerBrother: 3, languageMode: 'both' }}
    />
  );

  expect(screen.getByText(/Regional Convention/i)).toBeDefined();
  expect(screen.getByText(/Walang Pulong sa Kingdom Hall/i)).toBeDefined();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/printScheduleModal.test.tsx`
Expected: FAIL due to missing "Walang Pulong sa Kingdom Hall" notice in print sheet.

- [ ] **Step 3: Update `components/PrintScheduleModal.tsx` and `domain/scheduleFormatter.ts`**

In `components/PrintScheduleModal.tsx`:
Inside `batch.assignments.map(assignment => ...)`:
Check if `assignment.isSpecialEvent && (assignment.noMeeting ?? true)`:
Instead of rendering the `<table>` with duty rows, render the publication notice box:
```tsx
{assignment.isSpecialEvent && (assignment.noMeeting ?? true) ? (
  <div className="py-8 px-4 text-center bg-[#FAF6F5] border-t-[1.5px] border-[#EEDCDA] flex flex-col items-center justify-center space-y-2 [print-color-adjust:exact]">
    <div className="text-[17px] sm:text-[19px] font-black uppercase tracking-wider text-[#2A080D]">
      {assignment.specialEventTitle || 'Special Event / Assembly'}
    </div>
    <div className="text-[12px] sm:text-[13px] font-bold text-slate-600 uppercase tracking-widest">
      {settings.languageMode === 'tagalog'
        ? 'Walang Pulong sa Kingdom Hall'
        : settings.languageMode === 'both'
        ? 'Walang Pulong sa Kingdom Hall • No Meeting at Kingdom Hall'
        : 'No Meeting at Kingdom Hall'}
    </div>
  </div>
) : (
  <table ...>...</table>
)}
```
In `domain/scheduleFormatter.ts`:
Update `formatBrotherNamesForClipboard`:
When `assignment.isSpecialEvent && (assignment.noMeeting ?? true)`:
Return `{ formattedText: `${assignment.specialEventTitle || 'Special Event'} - (No Meeting)`, brotherCount: 0 }`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/printScheduleModal.test.tsx tests/scheduleFormatter.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/PrintScheduleModal.tsx domain/scheduleFormatter.ts tests/printScheduleModal.test.tsx tests/scheduleFormatter.test.ts
git commit -m "feat(print): render high-contrast notice card for No Meeting special weeks in print modal"
```

---

### Task 6: Comprehensive Verification & Full Regression Suite

**Files:**
- Test: All tests in `tests/`
- Command: `npm test` and `npm run build`

- [ ] **Step 1: Run full Vitest suite**
Run: `npm test`
Expected: All 18+ test files pass with 0 failures.

- [ ] **Step 2: Run production build check**
Run: `npm run build`
Expected: Vite build succeeds with 0 TypeScript or bundling errors.

- [ ] **Step 3: Commit any final polish**
```bash
git commit --allow-empty -m "chore: verify full test suite and production build pass for special week feature"
```
