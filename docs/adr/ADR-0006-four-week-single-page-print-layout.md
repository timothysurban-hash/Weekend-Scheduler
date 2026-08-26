# ADR-0006: 4-Weeks-Per-Page Single-Sheet Print Layout & Compact Typography

## Status
Accepted

## Context
Congregation overseers and coordinators frequently require a full 4-week monthly schedule to be printed or shared on a single sheet of paper (Letter/A4). With the previous 3-weeks-per-page pagination and 16px table text, a 4-week month was split across 2 pages.

## Decision
1. **4-Weeks-Per-Page Pagination**:
   - Set standard chunk size in chunkAssignmentsForPrint(filteredAssignments, 4) to 4 weeks per page.
   - For 4-week months (e.g. September), all 4 meetings render on a single sheet. For 5-week months, Page 1 contains Weeks 1–4 and Page 2 contains Week 5.
2. **Compact Typography & Cell Spacing**:
   - Table body text scaled from 16px to **13.5px (	ext-[13.5px])** with tight leading.
   - Date header banners scaled to **14px (	ext-[14px])** with py-0.5.
   - Table cell padding adjusted to py-0.5 px-2 (and py-0.5 px-1.5 for split cells).
   - Inter-table margins set to mb-2 and sheet container padding to p-3 sm:p-5 print:p-0.
3. **Date Range Default**:
   - startDate defaults to the 1st week of the month (monthDates[0]).
   - endDate defaults to the 4th week of the month (monthDates[3] or monthDates[monthDates.length - 1]).
4. **Design Token Preservation**:
   - Retains 1.5px blush stroke (order-[1.5px] border-[#EEDCDA]), #2A080D Discourse highlight, Satoshi typography, and #F9EEED zebra striping.

## Consequences
- A full 4-week month fits on 1 single printed sheet or single high-res image.
- Maintains high legibility and aesthetic balance.
