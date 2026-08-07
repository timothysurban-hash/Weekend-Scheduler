---
timestamp: 2026-08-07T02-35-31Z
slug: components-scheduleview-tsx
---
Method: dual-agent (A: 1bc80410-d719-4097-8de3-d0c4ee74c7d6 · B: 62af5b39-16d8-4b1e-852f-81951abd645f)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3/4 | Good toast feedback & exit/fill animations; active swap status visible in toolbar. |
| 2 | Match System / Real World | 3/4 | 3-cluster header ("1. Presiding", "2. Weekend Meeting", "3. Support Roster") matches Kingdom Hall meeting sections. |
| 3 | User Control and Freedom | 3/4 | Non-destructive 6-second Toast Undo available for Auto-Rotate, Authority Roles, Clear Month; lock protection. |
| 4 | Consistency and Standards | 2/4 | Desktop table uses semantic CSS design tokens (`bg-card`, `border-border`, `text-primary`); mobile cards retain legacy `slate-*` / `violet-*` classes. |
| 5 | Error Prevention | 3/4 | Row locking prevents accidental overwrites during auto-rotate or clearing; swap execution prevents swapping locked rows. |
| 6 | Recognition Rather Than Recall | 3/4 | Candidate options in `getBrotherCandidateOptions` display duty history directly ("Assigned 2w ago", "Assigned today") with status badges. |
| 7 | Flexibility and Efficiency | 2/4 | Lacks keyboard cell navigation/hotkeys (`L`/`S`); power users click individual dropdowns. |
| 8 | Aesthetic and Minimalist Design | 2/4 | Desktop table renders interactive CustomSelect dropdown boxes simultaneously; 3-cluster headers improve chunking. |
| 9 | Error Recovery | 3/4 | Clear error toasts; clear month dialog clearly highlights affected roles before execution. |
| 10 | Help and Documentation | 1/4 | Button tooltips exist; authority roles and cooldown months lack inline onboarding tooltips. |
| **Total** | | **25/40** | **Acceptable** (Strong domain alignment & candidate history tags; mobile tokenization & keyboard ergonomics remaining) |

---

## Anti-Patterns Verdict

### LLM Assessment (Design Director Review)
- **3-Cluster Visual Organization**: The introduction of 3 duty clusters ("1. Presiding", "2. Weekend Meeting", "3. Support Roster") effectively chunked 7 columns into clear meeting sections.
- **Candidate Recency Tags**: `getBrotherCandidateOptions` now surfaces recent assignment recency ("Assigned 2w ago", "Never assigned") with color status badges, eliminating memory recall during manual assignment.
- **Mobile vs Desktop Token Disconnect**: Desktop view relies cleanly on CSS design tokens (`bg-card`, `text-primary`, `border-border`), but mobile card view retains hardcoded `slate-50` / `text-violet-600` classes that require full token alignment for dark mode.

### Deterministic Scan (Detector & Codebase Findings)
- **14 Total Findings Detected across `components/ScheduleView.tsx`**:
  - **1 Contrast Failure**: Mobile ribbon `bg-amber-400 text-white` achieves ~1.9:1 contrast (WCAG AA requires 4.5:1).
  - **4 Non-Tokenized Classes**: Mobile cards retain `bg-slate-50`, `border-slate-200`, `text-violet-600`.
  - **5 Accessibility Defects**: Action touch targets (`h-8 w-8` icon buttons) are 32x32px (WCAG minimum is 44x44px); missing `Escape` hotkey handler to cancel active swap mode.
  - **4 Responsive Bottlenecks**: Mobile card list density on viewports below 360px.

---

## Overall Impression
[`ScheduleView.tsx`](file:///c:/Users/timot/Downloads/congregation-scheduler/components/ScheduleView.tsx) has advanced significantly. The 3-duty cluster visual headers and candidate assignment recency tags ("Assigned 2w ago") solve major cognitive load issues. The remaining refinements center on tokenizing mobile cards for dark mode and adding touch target padding and keyboard hotkeys.

---

## What's Working
1. **Candidate Recency Tags in `CustomSelect`**: Displaying assignment history ("Assigned 2w ago", "Never assigned") directly in candidate dropdowns removes memory burden for schedulers.
2. **3-Cluster Role Organization**: Grouping columns into "1. Presiding", "2. Weekend Meeting", and "3. Support Roster" matches Kingdom Hall meeting structures.
3. **Safety Net Snapshot Restores**: Bulk operations (auto-fill, clear month, authority roles) issue toasts with a 6-second 1-click undo snapshot restore.

---

## Priority Issues

### [P0] Mobile Ribbon Contrast & Touch Target Size
- **Why it matters**: `bg-amber-400 text-white` in mobile ribbon (~1.9:1) fails WCAG AA standards (4.5:1 required). `32x32px` (`h-8 w-8`) icon buttons are difficult to tap on mobile screens.
- **Fix**: Update mobile ribbon to `bg-amber-400 text-amber-950 font-extrabold`. Increase touch target padding on action buttons (`h-9 w-9` or `min-h-[44px]`).
- **Suggested command**: `$impeccable audit components/ScheduleView.tsx`

### [P1] Mobile Card Style Tokenization
- **Why it matters**: Hardcoded `bg-slate-50`, `border-slate-200`, and `text-violet-600` in mobile cards break theme consistency and dark mode contrast.
- **Fix**: Replace all hardcoded Tailwind palette classes in mobile view with semantic design tokens (`bg-card`, `bg-muted/40`, `text-foreground`, `border-border`, `text-primary`).
- **Suggested command**: `$impeccable colorize components/ScheduleView.tsx`

### [P2] Keyboard Hotkeys & Multi-Select Ergonomics
- **Why it matters**: Completing monthly schedules requires repetitive manual mouse clicks across cells with no keyboard shortcuts (`Escape` to cancel swap, `L` to lock).
- **Fix**: Add global keyboard event listeners for `Escape` (cancel swap) and arrow-key focus management across grid cells.
- **Suggested command**: `$impeccable polish components/ScheduleView.tsx`

---

## Persona Red Flags

### 👤 Alex (Power User / Congregation Secretary)
- **Red Flag**: Lack of keyboard shortcuts (`Escape` to cancel swap, cell arrow navigation) requires mouse clicks for routine schedule adjustments.
- **Impact**: Alex experiences interaction friction when reviewing multiple months of schedules.

### 👤 Jordan (First-Timer / Assistant Overseer)
- **Red Flag**: Displaying 35+ active dropdown boxes simultaneously on desktop initial load creates visual density.
- **Impact**: Jordan can feel intimidated by the dense array of inputs on first glance.

### 👤 Sam (Accessibility & Low Vision User)
- **Red Flag**: Mobile ribbon low contrast (`bg-amber-400 text-white`) and 32x32px action buttons fall below recommended touch guidelines.
- **Impact**: Sam experiences difficulty tapping controls on mobile screens and reading low-contrast labels.

---

## Minor Observations
- Button tooltips in the top header duplicate the visible button text.
- Swap mode status banner is positioned in the toolbar; adding visual outline glow to active swap target rows will improve clarity.

---

## Questions to Consider
1. *Would an Escape key handler to cancel active swap mode make schedule editing smoother for power users?*
2. *Should we convert all mobile list cards to use the same semantic CSS tokens as the desktop schedule table?*
