# 0054 Todo Week V2 And Server-Owned Duplicate

Date: 2026-07-22

## Status

Accepted and verified for `US-TODO-006` after the approved
D16-D18/D49-D50/D54-D58 Week direction, readiness validation, implementation,
and release proof.

## Context

Week must present seven compact planning columns while preserving shipped
reorder and movement behavior. Its rows intentionally hide note, Reminder, and
Repeat, so a browser-composed copy would lose durable state. The shared details
panel and full Todo contract are now complete after US-TODO-005.

## Decision

1. Add one authenticated `POST /api/v1/todos/{id}/duplicate` command. The server
   reads the owned source and creates a new incomplete identity on the same date
   at the next order, copying title, note, importance, Repeat, and Reminder.
2. Week uses seven equal Monday-Sunday columns, weekday-only headers, one
   title-only quick Add task control per day, and the shared details panel.
3. Week rows expose only completion, selectable wrapping title, and icon-only
   importance. The row remains the desktop drag surface.
4. Duplicate, explicit Move, and confirmed Delete live in the right-click/
   Shift+F10 menu, with no visible per-row menu or drag control.
5. With details open, desktop layout uses an approximate 4:1 board/panel split.
   Narrow overflow belongs to the board rather than the page.

## Consequences

- Duplicate cannot omit hidden source fields or cross an ownership boundary.
- Week creation and duplication do not auto-open or replace the current task
  selection.
- Keyboard users retain an explicit movement path while pointer users retain
  drag/drop.
- Long titles wrap and seven columns remain equal; narrow screens scroll the
  board locally.
- No EF migration is added by the final story.

## Alternatives Rejected

- Repost the compact row through Create: loses note, Reminder, and Repeat.
- Visible drag/copy/move controls: violates the locked three-control row.
- Overlay details above Week: conflicts with the approved 4:1 side-by-side
  layout.
- Compress columns without a minimum width: clips titles and overlaps controls.
