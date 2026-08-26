# ADR-0005: High-Resolution PNG Image Export for Print Schedule Sheets

## Status
Accepted

## Context
Coordinators often need to share the formatted 3-week weekend meeting schedule digitally (e.g., via messaging apps, email, or digital display boards) in addition to physical printing. Taking manual screen captures results in poor resolution, clipped borders, and compressed text.

## Decision
1. **Client-Side High-Resolution Rasterization**:
   - Utilize html-to-image (	oPng) with a **3x pixel ratio** (pixelRatio: 3) and clean white background (#ffffff), producing crisp, 300 DPI-equivalent high-definition images that preserve Satoshi typography, borders (#EEDCDA), #2A080D headers, and table styling.
2. **Sheet Export Behavior**:
   - Add a prominent "Save as Image" button next to "Print Schedule" in the print preview control bar.
   - When a single 3-week sheet is selected/rendered, downloads Weekend_Schedule_<startDate>_to_<endDate>.png.
   - When multiple pages are rendered, exports each sheet sequentially with designated page index names.
3. **User Feedback**:
   - Provide visual loading indicator ("Exporting..." state and disable during generation) to prevent redundant concurrent captures.

## Consequences
- Coordinators can produce publication-grade digital schedule images with 1 click.
- Zero server-side rendering dependencies needed; fully offline compatible.
- All styles, custom Satoshi fonts, and blush borders are rendered with 100% visual fidelity.
