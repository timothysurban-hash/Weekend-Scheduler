# ADR-0004: Cross-Month Date Range Selection & 3-Per-Page Pagination for Print Schedule Modal

## Status
Accepted

## Context
Previously, `PrintScheduleModal` strictly filtered meeting assignments by the active month and year of `viewDate`. When scheduling across month boundaries (e.g. Sept 27 to Oct 11), coordinators were unable to generate a unified 3-week printout spanning consecutive weeks across two different calendar months.

## Decision
1. **Dynamic Date Range Filtering**:
   - Provide "Start Date" and "End Date" meeting selector dropdowns in the print preview header.
   - Collect and sort all available assignment dates across the entire schedule.
   - Default the start and end dates to the currently viewed month (e.g. first meeting of viewed month to last meeting of viewed month).
   - Allow the user to select any start and end date to span across consecutive months (e.g. Sept 27 to Oct 11).
   - If the selected range has an end date before the start date, automatically adjust or clamp the range gracefully.
2. **3-Per-Page Chunking**:
   - The selected range of meetings is passed to `chunkAssignmentsForPrint(selectedAssignments, 3)`.
   - Exactly 3 meetings fit on Page 1 (e.g. Sept 27, Oct 4, Oct 11).
   - For ranges exceeding 3 meetings, multi-page chunking with page batch selector buttons ("All (3/page)", "Weeks 1–3", "Weeks 4–6") is preserved.
3. **Preserved Styling Invariants**:
   - 1.5px `#EEDCDA` blush grid borders.
   - `#F9EEED` alternating zebra striping.
   - `#2A080D` Discourse highlight unit.
   - 16px table typography with compact margins for 3-card single-page fit.

## Consequences
- Coordinators have full flexibility to print any custom sequence of weeks across month boundaries.
- The 3-per-page single-sheet fit is maintained regardless of the date range chosen.
