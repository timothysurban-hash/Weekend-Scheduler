# Design Spec: Bento Dashboard UI Redesign

**Date**: 2026-08-07  
**Status**: Approved  
**Target**: Congregation Scheduler App

## 1. Overview & Objective
Redesign the **Congregation Scheduler** web application to adopt a modern Bento-Grid dashboard aesthetic inspired by premium UI designs. Key visual traits include:
- A floating dashboard app shell centered on a soft pastel canvas.
- A dark left sidebar with squircle logo badges and rounded active nav items.
- Four pastel-tinted stat cards (Sky Blue, Mint Green, Lavender, Warm Cream) displaying key congregation scheduler metrics.
- A dark contrast callout card with subtle vector line patterns and pill action buttons.
- Extra-large border radii (`rounded-[32px]` for shell/modals, `rounded-2xl` for cards/bento items, `rounded-full` for badges).
- Pure alignment with existing app data and features (no dummy crypto or unnecessary components).

---

## 2. Structural & Layout Architecture

### A. Ambient Outer Frame & Floating Shell
- **Outer Canvas**: `min-h-screen bg-[#edf2f7] dark:bg-[#0d0e12] p-2 md:p-4 flex items-center justify-center`
- **Dashboard Frame**: Max-width container (`max-w-[1440px] w-full h-[calc(100vh-2rem)] rounded-[32px] bg-white dark:bg-[#14151b] shadow-2xl overflow-hidden flex border border-slate-200/60 dark:border-zinc-800`)

### B. Dark Sidebar (`Navbar.tsx`)
- Container: Dark charcoal/zinc (`bg-[#18181b] text-white flex flex-col justify-between p-4 border-r border-zinc-800 w-20 md:w-64`)
- Logo Badge: Soft cream squircle container (`bg-[#fef9c3] text-zinc-900 font-bold rounded-2xl p-3 flex items-center justify-center gap-3`)
- Navigation Items: Rounded pill/squircle buttons (`rounded-2xl hover:bg-zinc-800 transition-all duration-200`) with active indicators.

### C. Top Bar Header (`App.tsx` / Header component)
- Search & Quick Controls: Soft rounded input pill search bar, notification pill badge, and congregation profile pill badge.
- View Title: `text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight`

---

## 3. Bento Grid & Dashboard Widgets (`ScheduleView.tsx`)

### Pastel Stat Cards (Bento Header Grid)
1. **Schedule Status Card**:
   - Background: `bg-[#e8f1fd] dark:bg-[#1e293b]/60 border border-[#d0e2fb] dark:border-slate-700/50`
   - Content: Current assignment date range, progress count, and subtle mini line chart indicator.
2. **Active Speakers Card**:
   - Background: `bg-[#e6f4ea] dark:bg-[#14532d]/20 border border-[#ceebd6] dark:border-emerald-900/50`
   - Content: Total local brothers & visiting speakers count with green `+Active` pill tag.
3. **Role Rules Card**:
   - Background: `bg-[#f0ebf8] dark:bg-[#3b0764]/20 border border-[#e0d5f3] dark:border-purple-900/50`
   - Content: Guard rules status & conflict check metrics with lavender pill badge.
4. **Outline Library Card**:
   - Background: `bg-[#fffbeb] dark:bg-[#78350f]/20 border border-[#fef3c7] dark:border-amber-900/50`
   - Content: Public talk outline topics count with warm cream pill badge.

### Dark Hero Action Card
- Position: Main dashboard widget column.
- Styling: `bg-[#18181b] text-white rounded-3xl p-6 shadow-xl relative overflow-hidden`
- Visual Art: Subtle background geometric line overlays (`opacity-20`).
- Call to Action: Glowing pastel light-blue pill button (`bg-[#c7d2fe] hover:bg-[#b4c6fc] text-[#1e1b4b] font-semibold px-5 py-2.5 rounded-full shadow-md`).

---

## 4. List Items, Modals & Detail Components

- **Row Items** (`SpeakerList.tsx`, `OutlineList.tsx`, `RoleRulesView.tsx`):
  - Card rounded corners: `rounded-2xl`
  - Avatar badges: Dark squircle containers (`w-10 h-10 rounded-xl bg-slate-900 dark:bg-zinc-800 text-white font-bold flex items-center justify-center`)
  - Status Pills: `rounded-full px-3 py-1 text-xs font-semibold`
- **Modals** (`PrintScheduleModal.tsx`, `Settings.tsx`):
  - Container: `rounded-[28px] bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-2xl p-6`

---

## 5. Verification & Acceptance Criteria
- App renders within a floating rounded shell frame on larger viewports, responsive on mobile.
- All existing data, speaker controls, role rules, schedule assignments, and outline features remain fully functional.
- Zero broken imports or TypeScript errors.
- Visual alignment matches the reference design (Bento cards, pastel color tokens, dark sidebar, clean typography).
