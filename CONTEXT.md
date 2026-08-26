# Congregation Scheduler — Domain Context (CONTEXT.md)

## Domain Vocabulary

- **Brother**: A local congregation publisher or guest speaker participating in meeting assignments. Has an ID, name, congregation, spiritual status, blackout dates, and sort order.
- **Spiritual Status**: Normalized spiritual tier (`elder` | `ms` | `publisher` | `up`), establishing default qualifications:
  - `elder`: Qualified for all duties (Chairman, Speaker, Conductor, Reader, Attendants, Mic).
  - `ms` (Ministerial Servant): Qualified for Chairman, Speaker, Reader, Attendants, Mic.
  - `publisher`: Qualified for Attendants, Mic.
  - `up` (Unbaptized Publisher): Qualified for Mic only.
- **Duty Role**: A defined service position during the weekend meeting (`chairman`, `conductor`, `reader`, `speaker`, `attendant_entrance`, `attendant_auditorium`, `mic`, or custom role).
- **Role Roster**: The active rotation list of qualified brother IDs assigned to rotate through a specific duty role on a recurring frequency (weekly, biweekly, monthly).
- **Authority Role**: A static, preferred brother assignment (e.g. permanent Watchtower Conductor or Auditorium Attendant) configured in settings that can be bulk-applied across unlocked meeting dates.
- **Meeting Assignment**: A scheduled Sunday service entry containing assigned brother IDs for all roles, talk outline details, date (`YYYY-MM-DD`), lock state, and special event flags.
- **Blackout Date**: Specific date strings (`YYYY-MM-DD`) when a brother is unavailable for duty.
- **Multi-Role Collision**: Invariant preventing any brother from being assigned to more than one duty on the same meeting date (excluding Public Speaker if guest).

## Architectural Modules & Seams

- **Brother Directory (`domain/brotherDirectory.ts`)**: In-process deep module encapsulating multi-criteria brother queries, sorting heuristics, cross-assignment duty/hosting history, and record construction.
- **Schedule Engine (`domain/scheduleEngine.ts`)**: In-process deep module encapsulating rotation arithmetic, history scanning, tie-breaking offsets, authority role assignment, and calendar generation.
- **Eligibility Policy (`domain/eligibilityPolicy.ts`)**: In-process deep module encapsulating spiritual status tiering, qualification verification, roster inclusion, and collision checks.
- **Schedule Formatter (`domain/scheduleFormatter.ts`)**: In-process serialization module formatting assignments for clipboard rosters, exports, and print rendering.
- **Outline Importer (`domain/outlineImporter.ts`)**: In-process deep module encapsulating outline file parsing (CSV, TSV, text lists, JSON), quotation handling, BOM removal, duplicate checking, and historical metadata preservation.
- **Schedule Coordinator (`domain/scheduleCoordinator.ts`)**: In-process deep module and primary seam orchestrating meeting date backfilling, duty assignments, talk outline selections, guest discourse workflows, lock state invariants, multi-role collision auditing, and candidate scoring.
- **Schedule Presentation Seams (`components/schedule/`)**: Deep, memoized presentation components (`ScheduleDesktopRow`, `ScheduleMobileCard`, `MonthNavigationControl`, `ScheduleHeroCard`) preventing cascading DOM re-renders across the dashboard.
- **Native Device Bridge (`services/nativeBridge.ts`)**: Seam abstracting device capabilities (Capacitor Status Bar theming, Haptic feedback, Native Share Sheet, Local Friday 7:00 PM Duty Notifications).
- **Hybrid Storage Adapter (`services/storage/`)**: Seam managing offline persistence via SQLite on native mobile runtimes (`@capacitor-community/sqlite`) and IndexedDB (`idb`) on web/test runtimes with transparent auto-migration.

## Architecture Decision Records (ADRs)
- [ADR-0001: Historical Schedule Generation & Past Week Editing](docs/adr/ADR-0001-historical-schedule-generation.md)
- [ADR-0002: Standalone Capacitor Native Mobile App with Offline-First SQLite Architecture](docs/adr/ADR-0002-capacitor-offline-native-app.md)
- [ADR-0003: 3-Week Print Pagination, Scrollbar Suppression & Layout Optimization](docs/adr/ADR-0003-print-pagination-and-layout.md)
- [ADR-0004: Cross-Month Date Range Selection & 3-Per-Page Pagination for Print Schedule Modal](docs/adr/ADR-0004-cross-month-print-date-range.md)
- [ADR-0005: High-Resolution PNG Image Export for Print Schedule Sheets](docs/adr/ADR-0005-high-resolution-image-export.md)

