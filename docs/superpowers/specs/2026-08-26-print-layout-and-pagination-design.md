# Print Layout & Pagination Design Specification

**Date:** 2026-08-26  
**Status:** Approved  
**Topic:** 3-Week Print Pagination, Scrollbar Removal, and Browser Header/Footer Elimination

---

## 1. Problem Statement

When printing the monthly weekend meeting schedule:
1. Browser default headers (date/time, "Congregation Scheduler") and footers (URL, page numbers) appear and overlap with the document header.
2. The print preview renders a browser scrollbar due to `overflow-y-auto` and `fixed` positioning on the modal container.
3. 4-week or 5-week months overflow a single page, resulting in the 4th/5th week being cut off at the bottom.

---

## 2. Requirements & Desired Behavior

1. **3-Week Print Capacity**: Exactly up to 3 weeks are printed per page sheet to ensure proper vertical spacing and prevent bottom cutoffs.
2. **Automatic Multi-Page Pagination**: For a 4-week or 5-week month, the printout automatically breaks into multiple pages (e.g. Page 1: Weeks 1–3; Page 2: Weeks 4–5).
3. **Batch Selector**: In the print preview modal, users can select `All Weeks (3 per page)`, `Weeks 1–3`, or `Weeks 4–5` to preview and print only what they need.
4. **Header Consistency**: Every printed page contains the congregation header (`Congregation — Location`, `ARRANGEMENT FOR WEEKEND MEETING`, meeting time).
5. **No Scrollbars in Print Output**: Reset all overflow and fixed positioning in `@media print`.
6. **Suppression of Browser Headers/Footers**: Configure `@page { size: portrait; margin: 0; }` and page-level print padding (`10mm 12mm`) to prevent browser timestamps, page titles, and URLs.

---

## 3. Architecture & Domain Design

### 3.1 Domain Module (`domain/scheduleFormatter.ts`)

Introduce:
```typescript
export interface PrintAssignmentBatch {
  id: string; // e.g. "batch-1", "batch-2"
  label: string; // e.g. "Weeks 1–3", "Weeks 4–5"
  assignments: Assignment[];
}

export function chunkAssignmentsForPrint(
  assignments: Assignment[],
  batchSize: number = 3
): PrintAssignmentBatch[];
```

### 3.2 Presentation Component (`components/PrintScheduleModal.tsx`)

- Add state `selectedBatchId: string | 'all'` (defaults to `'all'`).
- If `all`, render all batches sequentially with CSS page-break separation (`break-after: page; page-break-after: always;` between sheets).
- If a specific batch ID is selected, render only that batch's printable sheet.
- Segmented control / filter button group in the print preview header.

### 3.3 CSS Rules (`index.html` / component print styles)

```css
@page {
  size: portrait;
  margin: 0;
}

@media print {
  body, html {
    background: white !important;
    color: black !important;
    overflow: visible !important;
  }

  /* Reset modal overlay */
  .print-modal-backdrop {
    position: static !important;
    background: transparent !important;
    padding: 0 !important;
    overflow: visible !important;
  }

  .print-page-sheet {
    box-sizing: border-box !important;
    padding: 10mm 12mm !important;
    margin: 0 !important;
    width: 100% !important;
    max-width: none !important;
    box-shadow: none !important;
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }

  .print-page-break {
    page-break-after: always !important;
    break-after: page !important;
  }
}
```

---

## 4. Test Strategy (TDD)

1. **`tests/scheduleFormatter.test.ts`**:
   - Verify `chunkAssignmentsForPrint` with 0 assignments -> empty array.
   - Verify `chunkAssignmentsForPrint` with 3 assignments -> 1 batch ("Weeks 1–3").
   - Verify `chunkAssignmentsForPrint` with 4 assignments -> 2 batches ("Weeks 1–3", "Week 4").
   - Verify `chunkAssignmentsForPrint` with 5 assignments -> 2 batches ("Weeks 1–3", "Weeks 4–5").
2. **`tests/printScheduleModal.test.tsx`**:
   - Verify rendering of batch selector buttons when > 3 assignments.
   - Verify changing batch updates displayed meeting cards.
   - Verify print styles classes and page break indicators.
