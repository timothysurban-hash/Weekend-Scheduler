# Bento Dashboard UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the Congregation Scheduler app into a Bento-Grid dashboard UI with a floating rounded shell, dark left sidebar, pastel tinted stat cards, pill controls, and dark accent callout cards without altering underlying application state or business logic.

**Architecture:** Wrap the main app in a centered floating container with extra-large border radius (`rounded-[32px]`) on a soft ambient background. Update the navigation bar into a dark charcoal sidebar with squircle logo badges and rounded active nav items. Replace existing top dashboard metrics in `ScheduleView.tsx` with pastel bento cards and a dark contrast hero action card. Update cards, avatars, and status badges across `SpeakerList.tsx`, `OutlineList.tsx`, and `RoleRulesView.tsx`.

**Tech Stack:** React 18 / TypeScript, Tailwind CSS, Lucide React icons.

## Global Constraints
- Preserve all existing React props, state hooks, and DataService handlers.
- Do not introduce dummy crypto components or unrelated widgets.
- Use explicit Tailwind utility classes (`rounded-[32px]`, `rounded-2xl`, `rounded-full`, pastel colors `bg-[#e8f1fd]`, `bg-[#e6f4ea]`, `bg-[#f0ebf8]`, `bg-[#fffbeb]`, dark hero `bg-[#18181b]`).

---

### Task 1: Outer Shell & Dashboard Layout Structure

**Files:**
- Modify: `index.html:117-154`
- Modify: `App.tsx:96-167`

**Interfaces:**
- Consumes: Existing `ViewState`, `Navbar`, and view components.
- Produces: Ambient outer canvas (`bg-[#edf2f7] dark:bg-[#0d0e12]`) and floating dashboard frame (`rounded-[32px] shadow-2xl`).

- [ ] **Step 1: Update `App.tsx` layout container**

Update the root layout wrapper in `App.tsx` from `h-screen bg-background` to a centered floating shell:

```tsx
<div className="min-h-screen bg-[#edf2f7] dark:bg-[#0d0e12] p-2 md:p-4 flex items-center justify-center font-sans antialiased text-foreground">
  <div className="max-w-[1440px] w-full h-[calc(100vh-2rem)] rounded-[32px] bg-white dark:bg-[#14151b] shadow-2xl overflow-hidden flex border border-slate-200/60 dark:border-zinc-800/80 relative">
    {/* Navigation & Main Content */}
  </div>
</div>
```

- [ ] **Step 2: Update Header Bar in `App.tsx`**

Add top-right pill controls (Search bar, Notification pill, Congregation Profile badge) into `App.tsx` header area:

```tsx
<header className="hidden md:flex items-center justify-between px-8 py-5 bg-white dark:bg-[#14151b] border-b border-slate-100 dark:border-zinc-800/60">
  <div>
    <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">{getViewTitle()}</h1>
  </div>
  <div className="flex items-center gap-3">
    <div className="relative">
      <input type="text" placeholder="Search..." className="w-48 lg:w-64 pl-9 pr-4 py-2 text-sm bg-slate-100 dark:bg-zinc-800/60 border border-slate-200/60 dark:border-zinc-700/50 rounded-full text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-zinc-600 transition-all" />
      <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-[18px]">search</span>
    </div>
    <button className="w-10 h-10 rounded-full bg-slate-100 dark:bg-zinc-800/60 border border-slate-200/60 dark:border-zinc-700/50 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-all">
      <span className="material-symbols-outlined text-[20px]">notifications</span>
    </button>
    <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-900/50 px-3 py-1.5 rounded-full text-amber-900 dark:text-amber-200 text-xs font-semibold">
      <span className="w-6 h-6 rounded-full bg-amber-400 text-amber-950 flex items-center justify-center font-bold text-[10px]">CS</span>
      <span>Congregation</span>
    </div>
  </div>
</header>
```

- [ ] **Step 3: Test build**

Run: `npm run build`
Expected: Build succeeds without errors.

---

### Task 2: Redesign Sidebar Navigation (`Navbar.tsx`)

**Files:**
- Modify: `components/Navbar.tsx`

**Interfaces:**
- Consumes: `currentView: ViewState`, `setView: (v: ViewState) => void`.
- Produces: Dark charcoal sidebar navigation matching the reference design.

- [ ] **Step 1: Replace Navbar container and logo badge styling**

Update `components/Navbar.tsx` to render a dark charcoal container (`bg-[#18181b]`) with squircle logo badge and rounded-2xl icon nav buttons:

```tsx
<aside className="hidden md:flex flex-col justify-between w-20 lg:w-64 bg-[#18181b] text-white p-4 border-r border-zinc-800 select-none">
  <div className="space-y-6">
    {/* Squircle Logo Badge */}
    <div className="flex items-center gap-3 px-2 py-2">
      <div className="w-12 h-12 rounded-2xl bg-[#fef9c3] text-zinc-900 flex items-center justify-center font-black shadow-md shrink-0">
        <span className="material-symbols-outlined text-2xl text-zinc-900">calendar_month</span>
      </div>
      <div className="hidden lg:block">
        <h2 className="font-bold text-sm text-white leading-tight">Congregation</h2>
        <p className="text-[11px] text-zinc-400">Scheduler</p>
      </div>
    </div>
    {/* Nav List with rounded-2xl items */}
  </div>
</aside>
```

- [ ] **Step 2: Test sidebar interactions**

Click through all navigation items (Schedule, Brother Management, Role Rules, Outline Library, Settings) and verify view switching works seamlessly.

---

### Task 3: Bento Stat Cards & Dark Hero Action Card in `ScheduleView.tsx`

**Files:**
- Modify: `components/ScheduleView.tsx`

**Interfaces:**
- Consumes: `assignments`, `speakers`, `outlines`, `settings`, `updateAssignments`, `updateSpeakers`.
- Produces: Pastel Bento cards and dark accent card dashboard layout.

- [ ] **Step 1: Replace header stats in `ScheduleView.tsx` with Pastel Bento Cards**

Implement the 4 pastel bento cards at top of `ScheduleView`:
- Sky Blue Card: `bg-[#e8f1fd] dark:bg-slate-900/60 border border-[#d0e2fb] dark:border-slate-800`
- Mint Green Card: `bg-[#e6f4ea] dark:bg-emerald-950/30 border border-[#ceebd6] dark:border-emerald-900/40`
- Lavender Card: `bg-[#f0ebf8] dark:bg-purple-950/30 border border-[#e0d5f3] dark:border-purple-900/40`
- Warm Cream Card: `bg-[#fffbeb] dark:bg-amber-950/30 border border-[#fef3c7] dark:border-amber-900/40`

- [ ] **Step 2: Add Dark Hero Accent Card**

Add the dark callout card in `ScheduleView.tsx`:
```tsx
<div className="bg-[#18181b] text-white rounded-3xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[200px]">
  {/* Abstract Vector Decorative Lines */}
  <div className="absolute -right-6 -bottom-6 w-48 h-48 border border-zinc-700/40 rounded-full pointer-events-none" />
  <div className="absolute -right-12 -bottom-12 w-64 h-64 border border-zinc-700/20 rounded-full pointer-events-none" />
  
  <div>
    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-800 border border-zinc-700 text-xs text-zinc-300 mb-3">
      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
      Smart Scheduler
    </div>
    <h3 className="text-xl font-extrabold text-white tracking-tight mb-1">Generate Monthly Schedule</h3>
    <p className="text-xs text-zinc-400 max-w-xs">Automate brother assignment rosters with role rule validation and availability checks.</p>
  </div>
  
  <div className="mt-6 flex items-center gap-3">
    <button onClick={onAutoGenerate} className="px-5 py-2.5 rounded-full bg-[#c7d2fe] hover:bg-[#b4c6fc] text-[#1e1b4b] font-bold text-xs shadow-lg transition-all active:scale-95">
      Auto-Assign Now
    </button>
  </div>
</div>
```

- [ ] **Step 3: Test `ScheduleView` rendering**

Run: `npm run build`
Expected: Build passes without TypeScript or JSX errors.

---

### Task 4: Card Containers, Avatars & Badges Across List Views

**Files:**
- Modify: `components/SpeakerList.tsx`
- Modify: `components/OutlineList.tsx`
- Modify: `components/RoleRulesView.tsx`

**Interfaces:**
- Consumes: Speaker list, Outline list, and Role rules state.
- Produces: Soft pastel backgrounds, squircle avatars (`rounded-xl`), rounded row cards (`rounded-2xl`).

- [ ] **Step 1: Update `SpeakerList.tsx` item cards and avatars**

Replace square/circle avatars with squircle dark containers (`w-11 h-11 rounded-xl bg-[#18181b] text-white font-bold flex items-center justify-center text-sm shadow-sm`). Wrap row items in `rounded-2xl bg-white dark:bg-zinc-900/80 border border-slate-100 dark:border-zinc-800 p-4 hover:border-slate-200 transition-all`.

- [ ] **Step 2: Update `OutlineList.tsx` cards**

Apply `rounded-2xl` card containers with pastel accent pill tags for categories.

- [ ] **Step 3: Update `RoleRulesView.tsx` guard containers**

Apply rounded card containers with color-coded pill toggle badges (`rounded-full px-3 py-1 font-semibold text-xs`).

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: Build succeeds with 0 errors.

---

### Task 5: Final Verification & Visual Polish

- [ ] **Step 1: Run production build check**
Run `npm run build` to ensure all TypeScript and Vite bundles compile cleanly.

- [ ] **Step 2: Interactive Verification**
Verify:
1. Floating dashboard shell is centered on pastel canvas with `rounded-[32px]`.
2. Dark sidebar is styled with squircle logo and active pill states.
3. Schedule dashboard displays 4 pastel bento cards and dark hero card.
4. All existing app features (adding/editing speakers, updating schedules, generating outlines, setting role rules) operate without regression.
