---
timestamp: 2026-08-07T02-29-23Z
slug: components-scheduleview-tsx
---
Method: dual-agent (A: 406f498b-af7c-4c5b-babe-81810b0f3fda · B: a7a4c6f7-ef05-449c-906d-64a2c080d89a)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3/4 | Toast feedback is good; missing inline visual diff highlight on table row state updates. |
| 2 | Match System / Real World | 4/4 | Excellent domain mapping ("WT Conductor", "Chairman", "Mic Servers"). |
| 3 | User Control and Freedom | 3/4 | Undo toast works well; swap flow requires multi-click confirmation modal. |
| 4 | Consistency and Standards | 2/4 | Mixed semantic design tokens with hardcoded `slate-*` / `violet-*` colors; desktop vs mobile input sizes diverge. |
| 5 | Error Prevention | 3/4 | Locked assignment protection and clear month confirmation modals work well; outline cooldown warnings present. |
| 6 | Recognition Rather Than Recall | 2/4 | Selecting speakers in dropdowns requires recalling qualifications or past assignment history. |
| 7 | Flexibility and Efficiency | 2/4 | Filling 30+ duty slots manually lacks keyboard cell navigation or batch column fill. |
| 8 | Aesthetic and Minimalist Design | 2/4 | 7 dense columns on desktop create visual noise; uppercase micro-label fatigue and border overload. |
| 9 | Error Recovery | 4/4 | 6-second grace period with 1-click snapshot restore on all bulk actions. |
| 10 | Help and Documentation | 2/4 | Button tooltips present, but auto-rotation candidate logic lacks inline contextual tooltips. |
| **Total** | | **27/40** | **Acceptable** (Solid functionality; WCAG contrast, accessibility, and visual density need refinement) |

---

## Anti-Patterns Verdict

### LLM Assessment (Design Director Review)
- **Visual Hierarchy & Density**: The desktop table crams up to 7 interactive dropdown columns per Sunday row, resulting in high cognitive load. Overuse of `text-[10px] uppercase tracking-wider` micro-labels creates visual noise rather than clear structure.
- **Color System Drift**: While the top hero section uses semantic Shadcn CSS variables, lower sections, popover menus, and badges hardcode legacy Tailwind classes (`text-slate-400`, `bg-amber-400`, `text-violet-600`), breaking theme consistency.
- **Border & Container Overuse**: Nested card containers and explicit borders on almost every element replace clean white space and depth hierarchy.

### Deterministic Scan (Detector & Codebase Findings)
- **30 Total Findings Detected across `components/ScheduleView.tsx`**:
  - **8 Contrast Issues**: `text-white` on `bg-amber-400` in "THIS WEEK" ribbon banner (~1.65:1 contrast, critical WCAG AA failure); `text-slate-400` on light backgrounds (~2.5:1 contrast across 18 label locations).
  - **7 Non-Tokenized Palette Issues**: Hardcoded `slate-400/600/700` and `violet-50/100/600` bypass theme tokens and break dark mode.
  - **9 Accessibility Defects**: Unlabelled icon-only buttons (`Cancel Swap`, `Prev/Next Month`, `Swap`, `Lock/Unlock`) missing `aria-label`; missing `aria-expanded` and `aria-haspopup` on column/export popover triggers; unassociated `<label>` tags missing `htmlFor` in modals.
  - **6 Responsive Bottlenecks**: Desktop table 8-column compression on tablet viewports (`768px - 1100px`); scrollbar-less horizontal role filter bar.

---

## Overall Impression
`ScheduleView.tsx` is feature-rich, reliable, and functional. Its auto-rotation engine, 1-click undo toasts, and authority role automation are well-engineered. However, the visual presentation suffers from dense table overload, low-contrast labels, hardcoded color classes, and missing accessibility attributes that hinder screen readers and low-vision users.

---

## What's Working
1. **Safety Net Snapshot Restores**: Bulk operations (auto-fill, clear month, authority roles) issue toasts with a 6-second 1-click undo snapshot restore.
2. **Domain-Specific Language**: Terminology aligns perfectly with congregation duty requirements ("Watchtower Conductor", "Entrance Attendant", "Mic Servers").
3. **Role & Column Visibility Filters**: Column popover and single-role focus filter allow users to hide non-essential columns to focus on specific duties.

---

## Priority Issues

### [P0] Accessibility & WCAG Contrast Failures
- **Why it matters**: `text-white` on `bg-amber-400` (~1.65:1) and `text-slate-400` labels (~2.5:1) fail WCAG 2.1 AA standards (4.5:1 required). Icon-only buttons lack `aria-label`s, preventing screen reader navigation.
- **Fix**: Replace low-contrast text with `text-slate-700` / `text-muted-foreground` and `text-amber-950 bg-amber-400`. Add explicit `aria-label` attributes to all icon buttons (`aria-label="Previous month"`, `aria-label="Toggle lock"`).
- **Suggested command**: `$impeccable audit`

### [P1] Desktop Table Density & Information Overload
- **Why it matters**: Displaying 7 columns with individual dropdown controls per Sunday row creates 30+ simultaneous interactive inputs, overloading working memory.
- **Fix**: Restructure the schedule layout into visual duty clusters (Public Talk vs. Watchtower Study vs. Support Roster). Raise the table responsive breakpoint to `lg:hidden` or add scrollable canvas (`min-w-[960px]`).
- **Suggested command**: `$impeccable layout`

### [P2] Hardcoded Palette & Token Disconnect
- **Why it matters**: Mixing `slate-*` and `violet-*` with Shadcn theme CSS variables breaks dark mode contrast and creates visual inconsistency.
- **Fix**: Replace all hardcoded Tailwind palette classes with semantic design system tokens (`bg-card`, `text-foreground`, `bg-accent`, `text-muted-foreground`, `border-border`).
- **Suggested command**: `$impeccable colorize`

### [P3] Lack of Keyboard Accelerators & Batch Selection
- **Why it matters**: Completing a monthly schedule requires up to 35 manual dropdown clicks without keyboard navigation or column batch fill options.
- **Fix**: Add grid keyboard navigation (Arrow keys + Enter to trigger cell dropdown) and an inline "Auto-Fill Column" header action.
- **Suggested command**: `$impeccable polish`

---

## Persona Red Flags

### 👤 Alex (Power User / Congregation Secretary)
- **Red Flag**: High interaction tax. Filling 30+ duty dropdowns per month requires repetitive manual clicks with no cell keyboard navigation (Tab/Arrow key focus).
- **Impact**: Alex finds routine monthly scheduling tedious when only minor manual tweaks are needed after auto-rotation.

### 👤 Jordan (First-Timer / Assistant Overseer)
- **Red Flag**: Visual clutter and uniform weight. Presented with 7 columns of empty select inputs, Jordan cannot easily distinguish primary meeting assignments (Speaker/Chairman) from support duties (Mic Servers).
- **Impact**: Jordan experiences decision fatigue and hesitates to make changes for fear of breaking constraints.

### 👤 Sam (Accessibility & Low Vision User)
- **Red Flag**: Icon-only buttons (`Lock`, `Swap`, `Prev/Next Month`) lack `aria-label` attributes, and `text-slate-400` micro-labels are unreadable under low contrast.
- **Impact**: Sam's screen reader announces "button" without context, and low-contrast labels are unreadable.

---

## Minor Observations
- Tooltips on primary top header buttons duplicate the button label text.
- The single-role focus filter bar lacks visible scroll indicators on small mobile viewports.
- The "THIS WEEK" ribbon uses CSS rotation (`rotate-45`) inside overflow containers, causing minor clipping on viewports under 360px.

---

## Questions to Consider
1. *What if duty roles were grouped into 3 visual clusters (Meeting Presiding, Watchtower Study, Support Roster) instead of 7 un-segmented table columns?*
2. *Would an inline "Quick Auto-Fill Column" action on each column header make monthly planning faster for power users?*
3. *Could candidate select options display eligibility tags (e.g., "Assigned 2w ago") inline within the dropdown menu?*
