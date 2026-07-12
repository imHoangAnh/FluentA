# Design

## Domain Model

Add `HabitIcon` under the Habit bounded context with exactly these values:
`Default`, `Book`, `Exercise`, `Water`, `Meditation`, `Study`, `Work`, and
`Health`. `Habit.Icon` becomes a required `HabitIcon`; `Habit.Color` is removed.
Creation defaults omitted icons to `Default`. Updates preserve the stored icon
when the patch omits it and reject unknown icon names with the existing
`422 VALIDATION_ERROR` envelope.

No scheduling, streak, reminder, ownership, or entry-eligibility rule changes.

## Application Flow

1. Create/update requests accept a semantic `icon` string and no `color`.
2. `HabitService` parses the icon at the application boundary and passes a
   `HabitIcon` to the aggregate.
3. List and stats responses serialize the enum using its semantic name.
4. Existing entry list/toggle endpoints continue to supply and mutate weekly
   completion data. The frontend requests every month intersected by the
   Monday-through-Sunday selected week, so cross-month weeks do not lose cells.
5. Existing TanStack Query invalidation and SignalR `HabitChecked` behavior
   remain the synchronization boundary.

## Interface Contract

- Remove `color` from `CreateHabitRequest`, `UpdateHabitRequest`, `HabitDto`,
  and `HabitStatsDto` and their TypeScript equivalents.
- Change `icon` from an optional free-form string to a required semantic value.
- Omitted create icon means `Default`; omitted patch icon means unchanged.
- Accepted JSON values are `Default`, `Book`, `Exercise`, `Water`,
  `Meditation`, `Study`, `Work`, and `Health`.
- Unknown icon values return `422 VALIDATION_ERROR` with an `icon` field error.
- Habit routes and response envelopes do not change.

## Data Model

- Drop `habits.color`.
- Keep the `habits.icon` column, make it required, and configure
  `HabitIcon` with EF string conversion and enough length for the longest enum
  name.
- The migration must not delete Habit or HabitEntry rows and must not contain
  emoji-to-enum mapping logic. Per approved D3, the developer resets the local
  development database before applying it; compatibility with arbitrary legacy
  icon data is not claimed.
- Regenerate the EF model snapshot through the normal EF migration workflow.

## UI / Platform Impact

- Centralize the `HabitIcon` TypeScript union, ordered dropdown options, and
  Lucide component map so Habit, Habit Stats, and Dashboard cannot drift.
- Recommended mapping: `Default` -> `CircleDot`, `Book` -> `BookOpen`,
  `Exercise` -> `Dumbbell`, `Water` -> `Droplets`, `Meditation` -> `Brain`,
  `Study` -> `GraduationCap`, `Work` -> `BriefcaseBusiness`, and `Health` ->
  `HeartPulse`. Planning validation must confirm every component exists in the
  installed Lucide version.
- Habit page keeps two columns near 50/50 at desktop and tablet widths. Remove
  the 420-pixel sidebar cap.
- The week header owns a selected Monday. Previous/next controls shift it by
  seven days. Rows render the same seven ISO local dates under the header.
- Each compact card uses a metadata line (mapped icon, name, and
  `fire + currentStreak`) above an aligned seven-cell grid. This preserves the
  approved content while keeping all seven cells usable through the existing
  1025-1279 pixel sidebar breakpoint range. Cells use existing toggle rules;
  future/unscheduled cells are disabled. The standalone today toggle is removed.
- Description renders after the four statistics and before the monthly
  calendar when non-empty.
- Shared teal/theme styling replaces per-Habit colors.
- Mobile-specific navigation and layout remain outside scope.

## Observability

No new logs, metrics, or audit records are required. Existing API validation
responses and `HabitChecked` realtime behavior remain observable proof points.

## Alternatives Considered

1. Keep `color` in storage but hide it in the UI. Rejected because D1 requires
   removal of the contract and persistence field.
2. Persist Lucide component names. Rejected because presentation-library names
   are not durable domain semantics.
3. Store the enum as an integer. Rejected because string storage is readable,
   stable across enum reordering, and matches the API value.
4. Show a rolling seven-day window. Rejected because D5 requires the selected
   Monday-through-Sunday calendar week.
5. Split this into backend-only and frontend-only stories. Rejected because
   neither slice provides an independently demonstrable product outcome.
