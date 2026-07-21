# Overview

## Dependency

Starts only after `US-TODO-005` is implemented and reviewed.

## Target Behavior

Week is entered from My Day's page-level menu and presents the approved header,
range label, seven weekday-only columns, and one title-only quick Add task
control per day. Week creation does not auto-open details. Selecting a task
opens the shared right panel.

Each Week row contains only completion, title, and icon-only importance. The
right-click/Shift+F10 menu exposes server-owned Duplicate and retains an
accessible explicit Move command without adding visible row controls.
Duplication copies all approved fields onto the same day under a new incomplete
identity. Navigation, completion, manual reorder, cross-day movement, and
deletion remain durable.

Desktop details use an approximately 4:1 board/panel split; closing details
returns the board to full width. Seven equal columns stay readable without
overlap, clipped task titles, or page-level horizontal overflow at the approved
desktop width. Narrow layouts may use local board scrolling.

## Required Boundaries

- Dedicated owner-scoped duplicate command; never reconstruct hidden fields
  from the compact row.
- Existing Week behavior and explicit accessible movement remain regression
  requirements.
- Visual/DOM overflow proof with details open and closed.
- Final Todo/Notification/job product contract, architecture decision, Harness
  evidence, migration, log, platform, and focused release proof.

## Non-Goals

- New Week date semantics or non-Monday week starts.
- Mobile drag-and-drop.
- Visible per-row overflow/copy/move controls.
- Reminder/repeat/note/date/textual Important metadata in Week rows.
