# Role Management System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a normalized, dynamic role management data model and publish the master `role-management` skill for congregation scheduling.

**Architecture:** Create normalized TypeScript entities for `RoleDefinition` and `BrotherQualification`, implement a Two-Tier Eligibility Engine (Qualification vs Active Roster), update `dataService` and UI components (`RoleRulesView`), and document guidelines in `.agents/skills/role-management/SKILL.md`.

**Tech Stack:** React, TypeScript, IndexedDB (`idb`), Tailwind CSS, Lucide icons.

## Global Constraints

- Preserve initial 7 congregation default roles (Chairman, Public Speaker, WT Conductor, WT Reader, Entrance Attendant, Auditorium Attendant, Mic Servers) without cluttering defaults.
- Do not break backward compatibility with existing saved schedule assignments in IndexedDB/LocalStorage.
- All roles must support explicit spiritual status requirements (`elder`, `ms`, `publisher`) and slot capacity.

---

### Task 1: Create Master Role Management Skill

**Files:**
- Create: `.agents/skills/role-management/SKILL.md`

**Interfaces:**
- Consumes: `docs/superpowers/specs/2026-08-07-role-management-design.md`
- Produces: Skill documentation file for system role management workflows.

- [ ] **Step 1: Write SKILL.md content**

Create `.agents/skills/role-management/SKILL.md` containing YAML frontmatter, two-tier eligibility workflows, ERD schema, and rules for dynamic role assignment.

- [ ] **Step 2: Verify file creation**

Verify file exists at `.agents/skills/role-management/SKILL.md`.

- [ ] **Step 3: Commit**

```bash
git add .agents/skills/role-management/SKILL.md
git commit -m "feat(skill): publish role-management skill"
```

---

### Task 2: Refactor Core Types (`types.ts`)

**Files:**
- Modify: `types.ts`

**Interfaces:**
- Consumes: None
- Produces: `RoleCategory`, `SpiritualStatus`, `RoleDefinition`, `BrotherQualification`, updated `Speaker` & `Assignment`.

- [ ] **Step 1: Write updated type definitions in `types.ts`**

Add `RoleCategory`, `SpiritualStatus`, `RoleDefinition`, `BrotherQualification` and update `Speaker` to include `spiritualStatus?: SpiritualStatus`.

- [ ] **Step 2: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: Compile clean or identify affected downstream files.

- [ ] **Step 3: Commit**

```bash
git add types.ts
git commit -m "refactor(types): introduce normalized RoleDefinition and SpiritualStatus interfaces"
```

---

### Task 3: Constants & DataService Normalization

**Files:**
- Modify: `constants.ts`
- Modify: `services/dataService.ts`

**Interfaces:**
- Consumes: `RoleDefinition` from `types.ts`
- Produces: `DEFAULT_ROLES`, `DataService.getRoles()`, `DataService.saveRoles()`

- [ ] **Step 1: Define `DEFAULT_ROLES` in `constants.ts`**

Populate default roles for Chairman, Speaker, Conductor, Reader, Entrance Attendant, Auditorium Attendant, and Mic Servers.

- [ ] **Step 2: Update `services/dataService.ts` for Roles & Qualifications persistence**

Add IndexedDB keys for `roles` and `qualifications`, with default fallback to `DEFAULT_ROLES`.

- [ ] **Step 3: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add constants.ts services/dataService.ts
git commit -m "feat(dataService): add IDB persistence and defaults for normalized roles"
```

---

### Task 4: Eligibility Logic & UI Component Refactoring

**Files:**
- Modify: `utils/dateUtils.ts`
- Modify: `components/RoleRulesView.tsx`

**Interfaces:**
- Consumes: `isBrotherQualifiedForRole` & `RoleRulesViewProps`
- Produces: Two-Tier Qualification + Active Roster UI management

- [ ] **Step 1: Update `utils/dateUtils.ts` for two-tier qualification evaluation**

Update `isBrotherQualifiedForRole` to evaluate candidate's `spiritualStatus` against `RoleDefinition.minSpiritualStatus`.

- [ ] **Step 2: Update `RoleRulesView.tsx` with Two-Tier Controls and Status Filters**

Render role cards using `DEFAULT_ROLES` / dynamic roles, allow toggling qualification and active roster, and add filter chips (`All`, `Elder`, `MS`, `Publisher`).

- [ ] **Step 3: Verify build and component rendering**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add utils/dateUtils.ts components/RoleRulesView.tsx
git commit -m "feat(ui): implement two-tier role qualification and roster management view"
```

---

### Task 5: Verification & End-to-End Validation

**Files:**
- Test: All touched files

- [ ] **Step 1: Run TypeScript compiler check**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 2: Final Commit**

```bash
git add .
git commit -m "chore: complete role management normalization and skill creation"
```
