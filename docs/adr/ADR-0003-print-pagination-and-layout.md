# ADR-0003: 3-Week Print Pagination, Scrollbar Suppression & Layout Optimization

## Context
When users printed the monthly schedule from the print preview modal:
1. Browser default headers (timestamp, app title) and footers (URL, page numbers) overlapped with the styled congregation title and content.
2. The print output rendered an unsightly vertical browser scrollbar because `overflow-y-auto` and `fixed` modal backdrop styling were not reset under `@media print`.
3. 4-week and 5-week months caused the final meeting table (e.g. Week 4/5) to be vertically cut off at the bottom edge of a single printed sheet.

## Decision
1. **3-Week Print Chunking**: `chunkAssignmentsForPrint` in `domain/scheduleFormatter.ts` partitions monthly assignments into discrete batches of up to 3 weeks (e.g. Weeks 1–3 on Page 1, Weeks 4–5 on Page 2).
2. **Interactive Batch Selection**: `PrintScheduleModal` provides a batch selector toolbar allowing coordinators to print `All Weeks (Paginated)` or specific batches (`Weeks 1–3`, `Weeks 4–5`).
3. **Clean Header Propagation**: Each 3-week page sheet carries the full congregation header, time, and title, ensuring every printed page is self-contained.
4. **Print Media CSS Isolation**:
   - Set `@page { size: portrait; margin: 0; }` with page-level padding (`10mm 12mm`) to suppress browser headers/footers.
   - Hide the background application (`#root` and all non-modal body elements) with `display: none !important` during `@media print` so only the print schedule modal sheets are printed.
   - Reset modal containers during `@media print` with `position: static !important; overflow: visible !important; height: auto !important;` to eliminate scrollbars.
   - Apply `page-break-after: always; break-after: page;` between multi-page batches.

## Consequences
- Printed rosters are cleanly formatted, fit comfortably within Letter and A4 physical bounds, and never truncate meeting cards.
- Browser scrollbars and header/footer watermarks are completely eliminated from printouts and PDF exports.
- Coordinators can choose between generating a complete multi-page monthly packet or printing a single focused 3-week handout.
