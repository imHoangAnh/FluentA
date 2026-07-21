# Design

## Vertical Slice

Add `IsImportant` to the existing Todo entity, EF configuration, migration,
create/update DTOs, projection, service, and frontend API type. Keep the current
owner-scoped repository and field-scoped PATCH behavior. No existing route is
removed or replaced.

The frontend keeps `/todo` and the existing query seam. `TodoPage` coordinates
the active surface and selected task, while focused components own the My Day
quick input, compact rows, context menu, Completed disclosure, and detail
panel. Week remains backed by the existing `TodoWeekView` until its planned
story.

## My Day State

- Query only the browser's current local calendar date.
- Store the active automatic sort as a versioned Todo-specific local-storage
  value. Absence means manual order.
- Derive automatic ordering in the client; never overwrite durable `sortOrder`
  merely by choosing or reloading an automatic sort.
- On drag start under an automatic sort, freeze the currently rendered
  incomplete order, clear the preference, then persist the final manual order.
- Keep selected task identity separate from list ordering so sorting, mutation,
  or completion does not close the panel.

## Autosave And Mutation Rules

- Quick create trims and validates the required title before POST.
- Title Enter and blur share one idempotent save path and do not issue a second
  PATCH when the normalized value has not changed.
- Note blur follows the same changed-value guard.
- Star and completion use explicit field-scoped PATCH payloads.
- Failed mutations retain or restore the last server value and show the
  existing application feedback pattern.
- Delete opens a confirmation surface; only confirmation calls DELETE. If the
  selected task is deleted successfully, close its panel.

## Interaction And Accessibility

- The task row remains one independently selectable surface; completion and
  star stop propagation and retain their own accessible names.
- Right-click and Shift+F10 open the same context menu at a visible anchored
  position. The menu supports arrow-key movement, Enter/Space activation,
  Escape close, and focus return to the invoking row.
- X has an accessible Close details name. Escape closes details unless a nested
  confirmation or menu owns the Escape key first.
- The side-by-side panel uses a bounded width; the list may shrink but the panel
  never overlays it at supported My Day widths. Neither surface creates
  page-level horizontal overflow.

## Compatibility Boundary

- Existing date/range GET, POST, PATCH, DELETE, completion timestamps, sort
  order, SignalR invalidation, soft delete, and ownership behavior remain.
- The migration adds a non-null boolean with a false default, so existing tasks
  remain non-important.
- Existing Week code can safely ignore the additive API field during this
  story. No reminder, recurrence, duplicate, Notification, or scheduled-job
  contract changes land here.

## Stop Conditions

- Stop if the slice requires replacing an existing Todo route/response shape.
- Stop if preserving Week behavior requires rewriting the Week planner in this
  story.
- Stop if local sort selection would need account persistence or a schema field.
- Stop if the current dirty Todo/product-doc edits cannot be merged without
  discarding user work.
