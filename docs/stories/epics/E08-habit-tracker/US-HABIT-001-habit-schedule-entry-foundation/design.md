# Design

## Domain Model

Add `Habit` and `HabitEntry` under the Habit bounded context.

`Habit` fields:

- `UserId`
- `Name`
- `Description`
- `Color`
- `Icon`
- `Frequency`
- `CustomDays`
- Base entity fields for identity, timestamps, and soft deletion

`HabitEntry` fields:

- `HabitId`
- `Date`
- Base entity fields for identity and timestamps

Rules:

- `UserId` is required.
- Name is trimmed, required, and at most 180 characters.
- Description is optional, trimmed, and at most 2000 characters.
- Color is optional and must be `#RRGGBB`.
- Icon is optional and at most 16 characters.
- Frequency is `Daily` or `Custom`.
- Custom schedules must contain at least one unique weekday and only apply when
  frequency is `Custom`.
- Daily habits are scheduled every day.
- Custom habits are scheduled only on their configured weekdays.
- Entry presence means completed; absence means incomplete.
- Future dates and unscheduled dates cannot be toggled.

## Application Flow

Commands:

- Create Habit.
- Patch Habit.
- Soft-delete Habit.
- Toggle Habit entry for a calendar date.

Queries:

- List habits with current learner-local summary.
- Get entries for a habit and month.

The service validates the browser timezone ID, derives the learner-local today,
checks schedule eligibility, then creates or removes the single entry row for a
toggle request. A toggle publishes `HabitChecked` only after persistence
succeeds if the notifier is included in this story.

## Interface Contract

All routes are authenticated and use the FluentA envelope.

- `GET /api/v1/habits?timeZoneId=...`
- `POST /api/v1/habits`
- `PATCH /api/v1/habits/{habitId}`
- `DELETE /api/v1/habits/{habitId}`
- `GET /api/v1/habits/{habitId}/entries?month=YYYY-MM&timeZoneId=...`
- `POST /api/v1/habits/{habitId}/entries`

Request DTOs:

- Create: `name`, optional `description`, optional `color`, optional `icon`,
  `frequency`, optional `customDays`.
- Patch: optional `name`, `description`, `color`, `icon`, `frequency`,
  `customDays`.
- Toggle: `date`, `timeZoneId`.

Response DTOs:

- Habit summary: `id`, `name`, `description`, `color`, `icon`, `frequency`,
  `customDays`, `currentStreak`, `isScheduledToday`, `isCheckedToday`,
  `monthlyCompletionRate`, `createdAt`, and `updatedAt`.
- Entry: `habitId`, `date`, `isCompleted`.
- Toggle result: `habitId`, `date`, `isCompleted`.

Errors:

- `422 VALIDATION_ERROR` for invalid input, invalid timezone, invalid month,
  future date, or unscheduled date.
- `404 HABIT_NOT_FOUND` for missing, deleted, or foreign-user habits.

## Data Model

Add tables:

- `habits`
- `habit_entries`

Indexes:

- `habits(user_id)`
- `habit_entries(habit_id, date)` unique
- `habit_entries(date)`

Relationships:

- `Habit` owns many `HabitEntry` rows.
- Deleting a habit soft-deletes the habit for this story; entry cleanup may be
  physical cascade only if EF deletion is not used for soft-delete.

Retention:

- Habits are soft-deleted.
- Entries for active habits remain durable history.

## UI / Platform Impact

No full Habit UI is required in this story. A minimal TypeScript API module may
be added so later frontend stories have a typed contract and the frontend build
continues to verify shared types.

## Observability

Habit requests use the existing canonical request log middleware. Logs must not
include descriptions or user-supplied habit text.

## Alternatives Considered

1. Store incomplete entries. Rejected because absence already represents
   incomplete and avoids redundant state.
2. Add reminders now. Rejected by locked decision D1.
3. Build the full grid with the foundation. Rejected so the unique data
   invariant and schedule rules can be proven first.

