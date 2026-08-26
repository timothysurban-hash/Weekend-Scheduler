# ADR-0007: Automatic Document Title & PDF Export Filename Generation

## Status
Accepted

## Context
When users print the schedule via browser print dialogs or select "Save as PDF" / "Microsoft Print to PDF", web browsers automatically populate the suggested PDF file name from document.title. Without dynamic title management, generic page titles like "Congregation Scheduler" or "Vite App" were suggested.

## Decision
1. **Dynamic Schedule PDF Title Generation**:
   - Implement generateSchedulePdfTitle(startDate, endDate) in domain/scheduleFormatter.ts producing Weekend_Schedule_<StartDate>_to_<EndDate> (e.g. Weekend_Schedule_2026-09-06_to_2026-09-27).
2. **Synchronized Title Lifecycle**:
   - When PrintScheduleModal is open, set document.title to the formatted schedule title matching the chosen startDate and endDate.
   - On handlePrint(), ensure document.title is applied, listening for fterprint and modal unmount to restore the application's original document title.
3. **Consistency Across Formats**:
   - Aligns the PDF naming pattern with the PNG image export filename convention (Weekend_Schedule_<StartDate>_to_<EndDate>).

## Consequences
- Printing or saving to PDF immediately pre-fills a clean, descriptive, date-bounded filename.
- Zero extra user keystrokes needed when saving monthly schedule PDFs.
