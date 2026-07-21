# Design

## Vertical Slice

Keep Week inside the existing `/todo` route and enter it only from My Day's
page-level menu. Week renders the title `Week`, one localized English range
label such as `July 20–26, 2026`, and seven equal Monday-Sunday columns whose
headers contain weekday names only.

Each day owns a compact title-only Add task form. Enter creates on that column's
date and leaves details closed. Selecting an existing row title opens the same
`TodoDetailsPanel` used by My Day.

## Week Rows And Interaction

A Week row has exactly three visible controls: completion, title, and icon-only
importance. Note, date, Repeat, Reminder, textual importance, drag handle,
delete, copy, and move controls do not render in the row.

The row remains the native desktop drag surface for durable within-day reorder
and cross-day movement. Right-click and Shift+F10 open one accessible context
menu with completion, importance, Duplicate, a Move-to-weekday submenu, and
confirmed Delete. The Move submenu preserves the shipped non-pointer path
without adding a visible row control.

## Server-Owned Duplication

Add `POST /api/v1/todos/{id}/duplicate`. The service reads the active source by
authenticated owner, obtains the next sort position on the same date, and
creates a new incomplete identity from durable source state. It copies title,
note, importance, Repeat, and the one Reminder tuple; it never reconstructs
hidden fields from the compact browser row. The new reminder starts a new
delivery cycle for the duplicate identity.

Missing, deleted, and foreign ids return the existing nondisclosing
`TODO_NOT_FOUND`. No schema or migration is required.

## Layout And Responsiveness

With details closed, the board uses the full content width. With details open
at desktop widths, the main grid uses a 4:1 board/panel split. The board owns
horizontal overflow locally and its seven columns share one equal minimum
width; task titles wrap instead of clipping or colliding with completion/star
controls.

At narrower supported widths the board may scroll horizontally, while the page
and application shell must not gain horizontal overflow. My Day's existing
side-by-side details behavior remains unchanged.

## Compatibility And Stop Conditions

- Preserve Monday week semantics, previous/next navigation, completion,
  manual ordering, cross-day movement, confirmation, and SignalR/cache rules.
- Preserve the finished My Day, Repeat, Reminder, and Notification behavior.
- Do not add mobile drag, visible row overflow/copy/move controls, a second Todo
  table, or a client-composed duplicate request.
- Stop if Duplicate needs a breaking route/DTO or if the seven-column board
  cannot keep overflow local at the approved widths.
