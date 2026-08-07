---
name: role-management
description: Use when auditing, configuring, extending, or assigning roles, brother qualifications, and rotation rosters in the congregation scheduler system
---

# Master Role Management Skill

## Overview

This skill governs the normalized role management architecture for the Congregation Scheduler application. It establishes the Two-Tier Eligibility model, dynamic role definitions, qualification junction patterns, and multi-duty collision avoidance rules.

## Core Architecture & Data Model

The role management system follows a normalized relational structure:

1. **Brothers (`Speaker`)**: Contains publishers, elders, ministerial servants, and guest speakers.
   - `id`: Unique identifier.
   - `name`: Full name.
   - `spiritualStatus`: `'elder' | 'ms' | 'publisher'`.
   - `unavailableDates`: ISO dates when the brother is unavailable.

2. **Roles (`RoleDefinition`)**: Represents duty roles in the congregation.
   - `id`: Unique identifier.
   - `key`: System key (e.g. `'chairman'`, `'speaker'`, `'conductor'`, `'reader'`, `'attendant_entrance'`, `'attendant_auditorium'`, `'mic'`).
   - `name`: Display name (e.g., "Chairman", "Public Speaker").
   - `tagalogName`: Tagalog translation (e.g., "Tagapangulo").
   - `category`: `'meeting_conduct' | 'attendants' | 'audio_video' | 'custom'`.
   - `minSpiritualStatus`: Minimum status required (`'elder'`, `'ms'`, or `'publisher'`).
   - `slotCapacity`: Number of brothers assigned per meeting slot (e.g., `mic = 2`).

3. **Qualifications (`BrotherQualification`)**: Junction array/table linking `brotherId` to `roleId`.

4. **Role Rosters (`RoleRule`)**: Active rotation configuration per role (`rosterIds`, `frequency`, `lastRotationIndex`).

5. **Assignment Duties (`Assignment`)**: Meeting line items mapping date, role, slot index, and assigned brother ID.

---

## Two-Tier Eligibility Rules

When evaluating if a brother can be assigned to a specific role on a specific meeting date:

```
[Candidate Brother]
        │
        ├── 1. Qualification Check (Tier 1)
        │      ├─ Is candidate in BrotherQualifications for this role?
        │      └─ Does candidate's spiritualStatus meet RoleDefinition.minSpiritualStatus?
        │
        └── 2. Active Roster & Availability (Tier 2)
               ├─ Is candidate in RoleRule.rosterIds (is_active)?
               ├─ Is candidate free from blackout dates?
               ├─ Is candidate free from other duty assignments on this meeting date (Collision Avoidance)?
               └─ Has candidate exceeded maxMonthlyDutiesPerBrother?
```

---

## Standard Role Registry

Default system roles:
- **Chairman** (`chairman`): Minimum status: `elder` or `ms`. Slot capacity: 1.
- **Public Speaker** (`speaker`): Minimum status: `publisher`. Slot capacity: 1.
- **Watchtower Conductor** (`conductor`): Minimum status: `elder` or `ms`. Slot capacity: 1.
- **Watchtower Reader** (`reader`): Minimum status: `elder` or `ms`. Slot capacity: 1.
- **Entrance Attendant** (`attendant_entrance`): Minimum status: `publisher`. Slot capacity: 1.
- **Auditorium Attendant** (`attendant_auditorium`): Minimum status: `publisher`. Slot capacity: 1.
- **Microphone Servers** (`mic`): Minimum status: `publisher`. Slot capacity: 2.

---

## Common Workflows

### 1. Adding a Dynamic Custom Role
To define a new custom duty role (e.g. "Stage Manager" or "Sound Operator"):
```typescript
const newRole: RoleDefinition = {
  id: 'role-sound',
  key: 'sound_operator',
  name: 'Sound Operator',
  tagalogName: 'Operator ng Tunog',
  description: 'Manages meeting sound level and audio feeds.',
  category: 'audio_video',
  minSpiritualStatus: 'publisher',
  slotCapacity: 1,
  isActive: true,
  isSystemDefault: false
};
```

### 2. Toggling Qualification vs Active Roster
- **Qualification**: Toggles whether a brother is certified/eligible for the role.
- **Active Roster**: Toggles whether the qualified brother participates in auto-rotation for a specific schedule period.

---

## Red Flags / Anti-Patterns to Avoid

- ❌ Hardcoding role assignment logic into UI rendering components.
- ❌ Allowing a brother to be assigned to two separate duties on the same meeting date.
- ❌ Assigning non-Elders or non-MS brothers to Chairman/Conductor/Reader roles without explicit admin override.
- ❌ Direct mutation of assignment columns without updating qualification records.
