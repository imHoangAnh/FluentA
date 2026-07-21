# Design

## Domain Model

Extend `Habit` with:

- `StartDate`: required date-only value.
- `GoalDays`: nullable positive integer; `null` means Forever.
- `ReminderTime`: required Vietnam-local minute value, default `20:00`, retained
  even when reminders are disabled so re-enabling preserves the chosen time.

Goal completion is derived from the number of active HabitEntry rows. A finite
goal is completed when the count reaches `GoalDays`. The aggregate exposes a
goal-completion cutoff date derived from the final required entry when complete;
removing an entry below the goal removes that cutoff and reactivates the Habit.

Domain/application rules:

- A Habit is scheduled on a date only when its frequency includes the weekday.
- It is eligible to check in only on/after Start Date and while the finite goal
  is not already complete, except an existing entry can always be unchecked.
- Start Date can change only while entry count is zero.
- A changed finite Goal Days value must be positive and greater than the current
  entry count. An unchanged finite goal and switching to Forever remain valid.
- Reminder Time has minute precision and uses `Asia/Ho_Chi_Minh`; no timezone is
  persisted per Habit.

## Application Flow

### Create/update

1. Parse Name/Description/Icon/Frequency/Custom Days as today.
2. Parse Start Date as `YYYY-MM-DD`, Goal Days as nullable positive `int`,
   Reminder Time as `HH:mm`, and a browser `timeZoneId` for Start Date's
   today-or-future validation.
3. On patch, load the owned active Habit and active entry count before applying
   Start Date or Goal Days changes.
4. Return field-scoped `422 VALIDATION_ERROR` details for malformed or invalid
   values; preserve `404 HABIT_NOT_FOUND` non-disclosure.

### List/main detail summaries

`ListAsync` accepts the browser timezone plus an optional `month=YYYY-MM`.
Omitted month means the learner-local current month for Dashboard compatibility.
A batched entry query supplies per-Habit:

- Total check-ins.
- Current and Longest streak.
- Selected-month completion rate.
- Goal completion/progress and completion cutoff date.
- Today's scheduled/checked state after Start Date and finite-goal rules.
- Whether Start Date remains editable.

The selected-month denominator includes scheduled dates on/after Start Date and
does not extend past a finite goal-completion cutoff. Existing full-month rate
behavior remains otherwise unchanged.

### Toggle

1. Validate date/timezone and load the owned active Habit.
2. Reject future, pre-start, or unscheduled dates.
3. In one transaction, lock the Habit row, inspect the target entry and current
   active count, allow removal of an existing entry, and reject insertion when
   the finite goal is already reached.
4. Insert/delete the unique Habit/date entry and return the new completion and
   total-goal state.
5. Publish `HabitChecked` only after durable commit.

The Habit-row lock serializes different-date toggles for the same Habit so two
concurrent requests cannot both cross the final Goal Days boundary.

### Reminder job

The recurring registration changes from once-daily UTC execution to every
minute. Each run:

1. Converts `DateTime.UtcNow` to `Asia/Ho_Chi_Minh` local date/time.
2. Loads enabled, active, started Habits whose Reminder Time is due and whose
   `LastReminderSentOn` is not the Vietnam-local date.
3. Excludes unscheduled dates, completed goals, and Habits checked that date.
4. Creates the existing owner-scoped in-app notification with dedupe key
   `habit:{habitId}:{yyyy-MM-dd}` and updates `LastReminderSentOn` in the same
   save.
5. Logs aggregate counts and identifiers without logging Habit names or other
   user-authored text.

Using `ReminderTime <= local now` provides same-day catch-up after worker delay;
the durable marker and notification unique key prevent repeated delivery.

## Interface Contract

Retained routes:

- `GET /api/v1/habits?timeZoneId=...&month=YYYY-MM`
- `POST /api/v1/habits`
- `PATCH /api/v1/habits/{id}`
- `DELETE /api/v1/habits/{id}`
- `GET /api/v1/habits/{id}/entries?month=YYYY-MM&timeZoneId=...`
- `POST /api/v1/habits/{id}/entries`

Removed route:

- `GET /api/v1/habits/{id}/stats`

Create adds required `startDate`, optional `goalDays`, `reminderTime` defaulting
to `20:00`, and required `timeZoneId`. Patch accepts their optional equivalents;
`timeZoneId` is required when changing Start Date.

Habit responses add:

- `startDate`, `goalDays`, `reminderTime`.
- `totalCheckIns`, `longestStreak`.
- `isGoalCompleted`, `goalCompletedOn`, `remainingGoalDays`.
- `canEditStartDate`.

Existing semantic icon, schedule, reminder-enabled, current streak, today
summary, monthly rate, timestamps, ownership, and envelope fields remain.

## Data Model

Add to `habits`:

- `start_date date NOT NULL`.
- `goal_days integer NULL` with `CHECK (goal_days IS NULL OR goal_days > 0)`.
- `reminder_time time without time zone NOT NULL`. The application/domain
  default is `20:00`; the column intentionally has no database default so EF
  always persists the valid midnight value `00:00` instead of treating it as a
  generated sentinel.
- A non-unique due-scan index beginning with reminder enabled/time.

Migration `Up` explicitly deletes `habit_entries` and then `habits` before
adding/depending on the new required contract. `habit_entries.habit_id` is the
only product foreign key to `habits` and already cascades; explicit ordered
deletes keep the approved boundary auditable. Notification dedupe keys are text,
not foreign keys, and Notification rows remain untouched per D7.

Migration `Down` removes the new columns/constraint/index but cannot restore
deleted rows; the migration and release notes state this limitation plainly.

## UI / Platform Impact

- Keep the existing approximately 50/50 desktop/tablet split and FluentA design
  tokens.
- The top Monday-Sunday strip contains keyboard buttons. Each announces date,
  completed/eligible counts, and selection state. SVG rings show aggregate
  progress without introducing inline presentation colors.
- Habit rows retain semantic icon, name, Current streak, selected outline, and
  one selected-date check button. Future, pre-start, unscheduled, and post-goal
  dates are disabled with non-color-only accessible labels.
- The detail panel renders Total check-ins, Monthly check-in rate, Current
  streak, Longest streak, optional finite-goal progress, bounded scrolling
  Description, then monthly calendar.
- The form keeps existing fields and adds Start Date, Goal Days preset/custom,
  reminder toggle, and one conditional time input. It prevents invalid values
  client-side but treats API validation as authoritative.
- Delete `HabitStatsPage` and its route/action. Rewrite route and E2E assertions
  around the main detail panel.
- Dashboard keeps its Habit list/quick toggle and filters using the server's
  updated `isScheduledToday` value.
- A new mobile-specific layout remains excluded; existing route availability is
  not removed on mobile.

## Threat Model And Controls

| Boundary/abuse case | Control |
| --- | --- |
| Malformed/negative Goal Days or invalid date/time strings | Parse-first application validation plus database positive-goal check. |
| Foreign user reads or mutates a Habit | Existing owner-scoped repository queries and 404 non-disclosure. |
| Check-in before Start Date, after completion, or on an unscheduled date | Server-side eligibility validation; disabled UI is not trusted. |
| Concurrent requests exceed Goal Days | Habit-row lock and single transaction around count/toggle. |
| Retry or overlapping reminder run duplicates notifications | Same-save delivery marker plus unique owner-scoped notification key. |
| Migration deletes unrelated data | Explicit table-qualified deletes, live before/after counts, schema FK inspection, and stop condition on any unexpected relationship. |
| User-authored Habit text leaks through job logs | Log identifiers and counts only; notification content remains owner-scoped product data. |

## Observability

- Preserve canonical API request logs and `HabitChecked` realtime event.
- Reminder job logs due/queued/skipped aggregate counts plus user/Habit ids,
  never Habit names or descriptions.
- Live proof records exact migration state, Habit/HabitEntry reset counts,
  notification dedupe, and concurrent-goal results in story validation.

## Alternatives Considered

1. Separate summary endpoint. Rejected because the list response already owns
   Dashboard-ready summary data and can accept the selected month.
2. Browser-computed Total/Longest/goal state. Rejected because jobs, Dashboard,
   and concurrency require one server-authoritative interpretation.
3. Store UTC reminder timestamps. Rejected because D8 fixes one local business
   timezone and the reminder recurs by Habit schedule date.
4. Persist completion status/date. Rejected because it would duplicate data
   derived from entries and complicate reactivation after uncheck.
5. Trust only the unique Habit/date index for concurrency. Rejected because it
   prevents duplicate dates but cannot prevent two different dates exceeding a
   finite aggregate goal.
