# Special Week Feature Design Spec

## 1. Overview & Problem Statement
In congregation scheduling for Jehovah's Witnesses, certain weeks throughout the year are marked by special events rather than ordinary Sunday congregation meetings:
- **Circuit Assemblies** (with Circuit Overseer or Branch Representative) and **Regional Conventions**: The congregation attends the assembly or convention program; no local meeting is held at the Kingdom Hall, meaning all regular local duties (Chairman, Conductor, Reader, Speaker, Attendants, Mics) are suspended.
- **Circuit Overseer (CO) Visits**: The congregation holds its weekend meeting at the Kingdom Hall, but the public talk is delivered by the visiting Circuit Overseer. Local brothers still handle Chairman, Watchtower Conductor, Watchtower Reader, Attendants, and Sound/Mic roles.
- **Memorial / Special Discourse**: Regular meeting format with customized talk themes or schedules.
- **Custom Special Events**: Congregation-specific events (e.g. Kingdom Hall dedication, maintenance work).

Previously, the data model had stub flags (`isSpecialEvent?: boolean`, `specialEventTitle?: string`), but there was no UI to configure them, no support for different event presets, no "No Meeting" row rendering, and the print layout rendered empty/blank duty rows for assemblies.

This feature introduces comprehensive special week management: an intuitive configuration modal, smart event presets with bilingual support (English/Tagalog), suspended duty state preservation, visual merged-row dashboard styling, and publication-ready print layout rendering.

---

## 2. Data Model & Types

### 2.1 Types (`types.ts`)
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
  micServerIds?: string[];
  isSpecialEvent?: boolean;
  specialEventType?: SpecialEventType;
  specialEventTitle?: string;
  noMeeting?: boolean;
  suspendedDuties?: SuspendedDuties;
  locked: boolean;
  speakerLocked?: boolean;
  note?: string;
  hostSpeakerId?: string | null;
  customTalkTitle?: string;
  customDutyAssignments?: Record<string, string[]>;
}
```

---

## 3. Presets & Localization

### 3.1 Presets Configuration (`constants.ts`)
Each preset defines its default title, default `noMeeting` setting, and bilingual labels:

| Preset Key | Default `noMeeting` | English Title | Tagalog Title | Duties Behavior |
| :--- | :--- | :--- | :--- | :--- |
| `circuit_assembly` | `true` | Circuit Assembly | Sirkito Asembliya | Suspends all local duties |
| `regional_convention` | `true` | Regional Convention | Rehiyonal na Kombensiyon | Suspends all local duties |
| `circuit_overseer_visit` | `false` | Circuit Overseer Visit | Dalaw ng Tagapangasiwa ng Sirkito | Retains duties; Speaker set to CO |
| `memorial` | `false` | Memorial | Memoryal | Retains duties |
| `special_talk` | `false` | Special Talk | Espesyal na Pahayag | Retains duties |
| `custom` | User choice | Custom Event | Natatanging Kaganapan | Toggleable `noMeeting` |

Banner subtitles for `noMeeting`:
- English: `"No Meeting at Kingdom Hall"`
- Tagalog: `"Walang Pulong sa Kingdom Hall"`
- Both: `"Walang Pulong sa Kingdom Hall • No Meeting at Kingdom Hall"`

---

## 4. UI Architecture & Components

### 4.1 Special Week Modal (`components/schedule/SpecialWeekModal.tsx`)
A clean, focused dialog triggered from desktop and mobile views:
- **Event Preset Selector**: Options for None (Normal Meeting), Circuit Assembly, Regional Convention, Circuit Overseer Visit, Memorial, Special Talk, Custom.
- **Title Input**: Pre-populated with localized preset default upon selection; fully editable.
- **"No Meeting at Kingdom Hall" Toggle**:
  - Automatically switches based on preset (ON for Assemblies/Conventions, OFF for CO Visits/Memorials).
  - Can be manually toggled if needed (e.g., custom assemblies or local variations).
- **Visiting Speaker Name / Note (for CO Visit or Custom)**: Optional field when duties remain active.
- **Actions**:
  - "Save Special Week": Commits changes. If `noMeeting` is enabled and duties exist, current duties are moved into `suspendedDuties` so brothers aren't double-booked or credited with rotation duties.
  - "Revert to Normal Meeting": Clears special event flags and restores any `suspendedDuties`.
  - "Cancel": Discards changes.

### 4.2 Desktop Row View (`components/schedule/ScheduleDesktopRow.tsx`)
- Beside the Date badge, a small button/badge:
  - If normal week: A subtle `"Special Week"` action button (or icon pill).
  - If special week: A styled badge displaying the event title/type (e.g. Amber pill for Assembly, Blue pill for CO Visit) that opens the modal on click.
- **When `isSpecialEvent && noMeeting`**:
  - The 6 duty columns (Chairman, Conductor, Reader, Speaker, Attendants, Mics) are replaced with a single `colSpan` merged banner card:
    - Left: Event type icon (calendar/users), bold title, and localized subtitle (*"Walang Pulong sa Kingdom Hall / No Meeting"*).
    - Right: `"Edit Special Week"` button.
- **When `isSpecialEvent && !noMeeting` (e.g. CO Visit)**:
  - Duty columns remain displayed and editable.
  - Speaker column highlights the visiting speaker/CO with an event badge.

### 4.3 Mobile Card View (`components/schedule/ScheduleMobileCard.tsx`)
- Header shows the Special Week button/badge next to the lock button.
- If `noMeeting`: Replaces the "Weekend Duty Roster" grid with an elegant, compact event banner highlighting the event title and "No Meeting at Kingdom Hall" notice, along with an "Edit Special Week" button.
- If duties active: Renders regular roster with the Special Event header badge.

---

## 5. Domain Engine & Scheduling Logic

### 5.1 Auto-Rotation (`domain/scheduleEngine.ts`)
- `autoRotateMonth` and `applyAuthorityRoles` already check `!a.isSpecialEvent`.
- Ensure they check `!a.isSpecialEvent || (a.isSpecialEvent && !a.noMeeting)`:
  - If it's a CO Visit (`noMeeting === false`), auto-rotation fills non-speaker roles (Chairman, Conductor, Reader, Attendants, Mics) without touching or overwriting the CO speaker assignment.
  - If `noMeeting === true`, skipping remains in effect so no brothers are assigned or counted.

### 5.2 Conflict & Double-Booking Auditing (`domain/scheduleCoordinator.ts`)
- When `noMeeting === true`, skip double-booking conflict warnings for this date since local duties are not scheduled.

### 5.3 State Preservation Helper
```typescript
export const setAssignmentSpecialEvent = (
  assignment: Assignment,
  params: {
    isSpecialEvent: boolean;
    specialEventType?: SpecialEventType;
    specialEventTitle?: string;
    noMeeting?: boolean;
    customTalkTitle?: string;
  }
): Assignment => {
  if (!params.isSpecialEvent) {
    // Revert to normal meeting: restore suspended duties if present
    const restored = assignment.suspendedDuties || {};
    return {
      ...assignment,
      isSpecialEvent: false,
      specialEventType: undefined,
      specialEventTitle: undefined,
      noMeeting: false,
      suspendedDuties: undefined,
      ...restored
    };
  }

  // Setting as special event
  if (params.noMeeting) {
    // Save current duties into suspendedDuties, then clear active fields
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
      customDutyAssignments: assignment.customDutyAssignments
    };

    return {
      ...assignment,
      isSpecialEvent: true,
      specialEventType: params.specialEventType,
      specialEventTitle: params.specialEventTitle,
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
      customDutyAssignments: {}
    };
  }

  // Special event with meeting held (e.g. CO Visit)
  return {
    ...assignment,
    isSpecialEvent: true,
    specialEventType: params.specialEventType,
    specialEventTitle: params.specialEventTitle,
    noMeeting: false,
    customTalkTitle: params.customTalkTitle || assignment.customTalkTitle
  };
};
```

---

## 6. Print Layout & PDF/PNG Export (`PrintScheduleModal.tsx`)

### 6.1 "No Meeting" Card Rendering
When `assignment.isSpecialEvent && (assignment.noMeeting ?? true)`:
- Burgundy header displays meeting date as usual.
- The entire duty table (`<table>`) is replaced by a high-contrast, publication-quality notice box:
  - Background: Clean white with subtle tinted border `#EEDCDA` / background `#FDFBF7`.
  - Prominent Title: `text-xl font-black text-[#2A080D] uppercase tracking-wide` displaying the `specialEventTitle` (e.g. **CIRCUIT ASSEMBLY OF JEHOVAH'S WITNESSES** or **REGIONAL CONVENTION**).
  - Subtitle: `text-sm font-bold text-slate-700 tracking-wider` displaying `"WALANG PULONG SA KINGDOM HALL / NO MEETING AT KINGDOM HALL"`.
  - Maintains exact card height / layout balance so 4-week-per-page print geometry is never disrupted.

### 6.2 CO Visit / Special Talk Card Rendering
- Retains full table.
- Speaker row displays `"Circuit Overseer"` (or assigned speaker name).
- Tema displays the special talk title or outline.

---

## 7. Verification & Testing Strategy

1. **Unit Tests**:
   - `tests/specialWeek.test.ts`: Verify `setAssignmentSpecialEvent` correctly sets flags, preserves/restores `suspendedDuties`, clears active duties on `noMeeting`, and restores on revert.
   - `tests/scheduleEngine.test.ts`: Verify `autoRotateMonth` skips `noMeeting` weeks while scheduling CO visit weeks (without overwriting CO speaker).
   - `tests/scheduleFormatter.test.ts`: Verify formatting of outline info, print info, and clipboard text for special events.
2. **Component & Integration Tests**:
   - Desktop and Mobile row rendering: Verify merged banner renders for `noMeeting` weeks, and regular columns render for CO visits.
   - `PrintScheduleModal.test.tsx`: Verify special week banner renders cleanly without crashing and exports properly.
3. **Run Full Test Suite**:
   - Execute `npm test` to ensure all existing and new tests pass without regressions.
