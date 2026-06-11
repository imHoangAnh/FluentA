# Design

## Domain Model

Add `TodoItem` under the Todo bounded context.

Fields:

- `UserId`
- `Title`
- `Note`
- `Date`
- `IsCompleted`
- `CompletedAt`
- `SortOrder`
- `IsCarriedOver`
- `OriginalDate`
- Base entity fields for identity, timestamps, and soft deletion

Rules:

- `UserId` is required.
- `Title` is trimmed, required, and at most 240 characters.
- `Note` is optional, trimmed, and at most 4000 characters.
- Public date values are `YYYY-MM-DD` strings parsed at the boundary and
  persisted as normalized date values.
- `SortOrder` must be zero or greater.
- Completing a task sets `CompletedAt`; un-completing clears it.
- Rescheduling updates `Date`.
- Carry-over preserves `OriginalDate` the first time a task is moved and sets
  `IsCarriedOver`.

## Application Flow

Commands:

- Create Todo task.
- Patch Todo task fields.
- Delete Todo task.
- Carry over eligible tasks for the current user and today.

Queries:

- List tasks for one date.
- List tasks for an inclusive date range.

The list flow for day access runs carry-over first, then returns active tasks
for the selected date. Carry-over is scoped to the authenticated user and is
idempotent for repeated reads.

## Interface Contract

All routes are authenticated and use the FluentA envelope.

- `GET /api/v1/todos?date=YYYY-MM-DD`
- `GET /api/v1/todos?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`
- `POST /api/v1/todos`
- `PATCH /api/v1/todos/{id}`
- `DELETE /api/v1/todos/{id}`

Request DTOs:

- Create: `title`, `date`, optional `note`.
- Patch: optional `title`, `date`, `note`, `isCompleted`, and `sortOrder`.

Response DTO:

- `id`, `title`, `note`, `date`, `isCompleted`, `completedAt`, `sortOrder`,
  `isCarriedOver`, `originalDate`, `createdAt`, and `updatedAt`.

Errors:

- `422 VALIDATION_ERROR` for invalid input.
- `404 TODO_NOT_FOUND` for missing, deleted, or foreign-user tasks.

SignalR:

- Completion changes publish `TodoItemChecked` with `todoId` and
  `isCompleted` after persistence succeeds.

## Data Model

Add table `todo_items`.

Columns:

- `id`
- `user_id`
- `title`
- `note`
- `date`
- `is_completed`
- `completed_at`
- `sort_order`
- `is_carried_over`
- `original_date`
- `created_at`
- `updated_at`
- `deleted_at`

Indexes:

- `(user_id, date)`
- `(user_id, is_completed, date)`
- `(user_id, date, sort_order)`

Retention:

- Delete is soft-delete for this story.

## UI / Platform Impact

Add a protected `/todo` route and a navigation entry from the authenticated
workspace header.

The day page includes:

- Date heading and previous/next day controls.
- Inline task creation.
- Task list with checkbox, title, optional note, carried-over indicator, and
  delete action.
- Empty, loading, and error states.
- Mobile-usable controls without drag-and-drop.

## Observability

Todo requests use the existing canonical request log middleware. Logs must not
include task notes or sensitive auth tokens.

## Alternatives Considered

1. Scheduled carry-over job. Rejected by locked decision D2; on-access
   carry-over is the S1 behavior.
2. Whole-record patch. Rejected because existing learnings require
   field-scoped updates to avoid overwriting concurrent edits.
3. Implement Week view together with daily foundation. Rejected so the first
   story can validate data model, carry-over, and API ownership before adding
   desktop drag interactions.
