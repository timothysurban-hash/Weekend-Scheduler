# ADR-0001: Historical Schedule Generation & Past Week Editing

## Context
Previously, the schedule view automatically generated 52 future Sundays starting from the current date. When a coordinator navigated back to past months (e.g., to record past assignments or backfill meeting records), the schedule view had no cards available unless pre-existing assignments were found.

## Decision
1. **Automatic Month Sunday Generation**: Whenever any month is viewed (past, present, or future), `ensureMonthSundays` will guarantee all Sundays for that month exist as cards ready for editing.
2. **Full Historical Access**: Past weeks support manual assignment, talk outline picking, and auto-rotation (provided meetings are not locked).
3. **Sequential History**: Historical assignments immediately feed into `getLastRoleDate` and `getBrotherLastAssignment`, maintaining accurate rotation sequencing and fairness across future meetings.

## Consequences
- Coordinators can easily record past meeting arrangements and maintain complete annual histories.
- Navigating to past months immediately renders all Sunday cards with zero empty-state dead ends.
- Rotation algorithms seamlessly account for backfilled historical duties.
