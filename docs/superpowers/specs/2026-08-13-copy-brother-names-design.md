# Design Spec: Copy Non-Speaker Brother Names in Schedule

## Goal
Provide a convenient "Copy" button on the left below each meeting assignment in the schedule dashboard. Clicking this button extracts and copies the names of all assigned brothers for that specific date (excluding the public speaker) to the system clipboard, formatted line-by-line.

## User Requirements & Decisions
- **Location**: Bottom-left area of each individual meeting card/row in both Mobile and Desktop views of the Dashboard (`ScheduleView.tsx`).
- **Scope**: Copies non-speaker assigned brothers for that specific meeting date only.
- **Excluded Roles**: Public Speaker (`speakerId`) is strictly excluded.
- **Included Roles**:
  - Chairman (`chairmanId`)
  - Watchtower Conductor (`conductorId`)
  - Watchtower Reader (`readerId`)
  - Entrance Attendant (`entranceAttendantId`)
  - Auditorium Attendant (`auditoriumAttendantId`)
  - Mic Servers (`micServerIds`)
  - Any custom duty assignments (`customDutyAssignments`), if populated.
- **Output Format**: Clean newline-separated brother names (e.g. `Lavado, Joel\nJohn Doe\n...`), skipping any unassigned/empty slots.
- **Feedback**: Displays a success toast message (e.g. `"Copied brother names to clipboard!"`).

## Component & UI Design
### 1. `ScheduleView.tsx`
- **Helper Function**: `getCopyableBrotherNames(assignment: Assignment, speakers: Speaker[]): string`
  - Looks up each non-speaker role ID in `speakers`.
  - Collects non-empty brother names into an array.
  - Returns names joined by `\n`.
- **Copy Handler**: `handleCopyBrotherNames(assignment: Assignment)`
  - Calls `navigator.clipboard.writeText(names)`.
  - Triggers `showToast('Copied brother names for ' + formattedDate, 'success')`.
- **Desktop Table View (`hidden md:block`)**:
  - Positioned in the first column (`Meeting Date` column) at the bottom-left, below the date and status badges.
  - Styled as a sleek, low-profile button with a copy icon (`<Copy className="w-3.5 h-3.5" />` or `<Icon name="content_copy" />`) and "Copy" label.
- **Mobile Card View (`md:hidden`)**:
  - Positioned at the bottom-left of the card (or header row of the card), easily accessible for mobile users.

## Verification Plan
1. Assign brothers to Chairman, Conductor, Reader, Attendants, Mic Servers, and Public Speaker on a test date.
2. Click the Copy button on desktop table view for that date.
3. Verify clipboard contains only non-speaker brother names line-by-line.
4. Verify toast notification appears.
5. Repeat for mobile view.
