# Design

## Domain Model

Reuse existing `Habit` schedule rules and `HabitEntry` completed-date rows.
Daily habits count every day as scheduled. Custom habits count only configured
weekdays; unscheduled days do not break streaks and do not count in completion
rate denominators.

## Application Flow

- Add a Habit stats query to `IHabitService`.
- Validate `timeZoneId` at the application boundary.
- Load only the authenticated user's active habit.
- Query historical entries for the habit and compute:
  - current streak using the existing learner-local convention;
  - longest streak across stored historical entries;
  - last 7-day completion rate;
  - last 30-day completion rate.
- Return `404 HABIT_NOT_FOUND` for missing, deleted, or foreign-user habits.

## Interface Contract

- `GET /api/v1/habits/{habitId}/stats?timeZoneId=...`

Response data:

- habit identity and schedule summary;
- `currentStreak`;
- `longestStreak`;
- `last7DaysCompletionRate`;
- `last30DaysCompletionRate`;
- `completedLast7Days`, `scheduledLast7Days`;
- `completedLast30Days`, `scheduledLast30Days`;
- `asOfDate`.

## Data Model

No migration. Use existing `habits` and `habit_entries` tables and the existing
`habit_entries(habit_id, date)` unique index.

## UI / Platform Impact

- Add protected route `/habits/:habitId/stats`.
- Link each Habit card to its stats page.
- Render stat cards and a small schedule/details panel.
- Keep navigation back to `/habits`.

## Observability

Existing request logging covers the stats endpoint. The response must not log
habit descriptions or user-supplied habit text outside normal request metadata.

## Alternatives Considered

1. Calculate longest streak and rolling rates in the browser. Rejected because
   stats would drift from future Dashboard/API consumers and bypass the
   validated timezone boundary.
2. Add columns or materialized aggregates. Rejected because current data volume
   and story scope do not require a schema change.
