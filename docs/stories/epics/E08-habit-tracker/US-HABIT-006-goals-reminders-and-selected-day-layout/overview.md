# Overview

## Status

Implemented and reviewed on 2026-07-21. Decisions D1-D19, including the
destructive Habit/HabitEntry-only reset, are represented in source, the applied
PostgreSQL migration, product documentation, automated proof, and live runtime
evidence.

## Current Behavior

The protected Habit page uses an approximately 50/50 desktop/tablet layout with
a top seven-day selector and one selected-date check-in action per Habit row.
The right panel is the only Habit statistics surface and contains Total
check-ins, Monthly check-in rate, Current streak, Longest streak, optional
finite-goal progress, the preserved bounded/scrolling description, and the
monthly calendar. No dedicated Habit Stats page or API route remains.

Habits have an explicit Start Date, an optional finite successful-check-in
goal, and one optional minute-precision reminder time interpreted in fixed
`Asia/Ho_Chi_Minh` time. Goal-safe entry mutations are serialized per Habit and
the minute recurrence retains durable once-per-Habit/date delivery guards.

## Target Behavior

Redesign the desktop/tablet Habit list to match the supplied selected-day
reference while preserving FluentA's current color system, semantic icons,
frequency rules, ownership rules, realtime synchronization, monthly calendar,
description, edit/delete actions, and eligible-date validation. Add an explicit
start date, optional successful-check-in goal, and one optional custom reminder
time interpreted in `Asia/Ho_Chi_Minh`.

The schema migration for this story intentionally removes all existing Habit
and HabitEntry rows, as explicitly approved during exploration, before applying
the new required Habit fields. No other product data is part of the reset.

## Locked Decisions

- **D1:** Replace the seven completion cells inside each Habit row with one
  check-in button for the currently selected date. The seven-day strip at the
  top selects that date. Existing future-date and unscheduled-date restrictions
  still apply.
- **D2:** Each date in the seven-day strip shows aggregate completion across
  all Habits eligible on that date. For example, three completed Habits out of
  four eligible Habits renders 75%; full completion renders a check mark.
  Habits that have not started, have completed their goal, or are not scheduled
  on that date are excluded from the denominator.
- **D3:** `Goal Days` means a target count of successful, eligible check-in
  dates. It is not a calendar-duration or consecutive-streak target. One Habit
  can add at most one successful check-in per eligible date, and unchecking an
  entry reduces progress.
- **D4:** Goal choices include `Forever`, `7`, `21`, `30`, `100`, `365`, and a
  positive custom value. `Forever` is represented by a nullable finite goal.
- **D5:** Reaching a finite goal marks the Habit completed, keeps it visible for
  history/edit/delete, stops new check-ins, and removes it from later aggregate
  day denominators. Unchecking an earlier entry below the goal reactivates it.
- **D6:** New Habits allow only today or a future Start Date. Dates before the
  Start Date cannot be checked and do not participate in daily aggregate
  progress. A future-start Habit remains visible with a `Starts on ...` state.
- **D7:** The migration deletes every existing HabitEntry and Habit so the
  redesigned tracker starts empty. This reset does not include Todo, Countdown,
  Notification, learning, or other product records and is recoverable only
  from a database backup.
- **D8:** Reminder times use the fixed `Asia/Ho_Chi_Minh` timezone for every
  Habit. The durable Habit record stores local reminder time, not a per-Habit
  timezone identifier.
- **D9:** Reminder remains optional. An enabled reminder has exactly one local
  time, defaulting to `20:00`. It sends only on a scheduled, started, active-goal
  day when the Habit is still unchecked, at most once for that Habit/date.
- **D10:** Remove `HabitStatsPage`, the `/habits/{habitId}/stats` route, its
  navigation action, and superseded tests/contracts. The main detail panel
  becomes the only Habit statistics surface.
- **D11:** The detail panel has exactly four statistic cards: Total check-ins,
  Monthly check-in rate, Current streak, and Longest streak. It does not show a
  Monthly check-ins card.
- **D12:** A finite goal renders a progress card such as `35/100` and
  `65 days left`. A Forever Habit does not render the goal progress card.
- **D13:** Detail order for a finite goal is statistics, goal progress,
  description, then monthly calendar. For Forever it is statistics,
  description, then calendar. Description text wraps, cannot cause horizontal
  overflow, and scrolls vertically inside a bounded-height card when long.
- **D14:** Each left-column row retains the current semantic icon, name, and
  compact Current streak metadata. It does not add Total check-ins. The row's
  right side contains the selected-date check-in button, and the selected row
  retains the current primary outline treatment.
- **D15:** Keep separate Edit and Delete actions in the selected-Habit header.
  Remove only the Stats action; do not replace the actions with an overflow
  menu.
- **D16:** Start Date can be edited until the first check-in. After the first
  check-in it is read-only.
- **D17:** Goal Days can be edited after progress exists, but a newly selected
  finite goal must be greater than the current check-in count. An unchanged
  stored goal remains valid during unrelated edits, and switching to Forever
  is always allowed.
- **D18:** The redesign targets the existing desktop/tablet two-column
  contract. A new mobile-specific layout or navigation flow is outside scope.
- **D19:** Preserve the existing Name, Description, Icon, Frequency, Custom
  Days, and reminder enabled/disabled fields. Add only Start Date, Goal Days,
  and Reminder Time. Do not add the reference application's Goal type, Section,
  or Auto pop-up concepts.

## Feature Boundary

### Included

- Selected-day week strip and aggregate daily completion presentation.
- Single selected-date check-in action per Habit row.
- Start Date, nullable finite Goal Days, completion state derived from durable
  check-ins, and fixed-Vietnam-time reminder configuration.
- Destructive Habit/HabitEntry reset inside the schema migration.
- Reminder worker scheduling changes needed for custom local times and
  once-per-Habit/date delivery.
- Removal of the dedicated Habit Stats route and promotion of Longest streak to
  the main Habit detail response.
- Goal progress, bounded scrolling description, and monthly calendar in the
  selected-Habit detail panel.
- Coordinated domain, API, persistence, frontend, automated test, product
  contract, decision, and Harness evidence changes.

### Excluded

- Any data deletion outside Habit and HabitEntry records.
- Per-user or per-Habit timezone selection.
- Multiple reminder times per Habit.
- Consecutive-streak goals or calendar-duration goals.
- Reference-only Goal type, Section, Auto pop-up, or Habit Log concepts.
- A new mobile-specific Habit layout.
- Changes to FluentA's current color palette or semantic Habit icon vocabulary.
- Changes to unrelated productivity or learning domains.

## Affected Users

- Authenticated learners who create and track Habits.

## Affected Product Docs

- `docs/product/personal-productivity.md`
- `docs/decisions/0045-habit-semantic-icons-and-color-removal.md`
- `docs/decisions/0046-habit-goals-reminders-and-selected-day-redesign.md`

## Existing Behavior To Preserve

- Owner-scoped Habit and HabitEntry access with foreign/deleted resources
  hidden as not found.
- Daily and Custom weekday schedules.
- Future and unscheduled check-in rejection at both UI and API boundaries.
- Monthly navigation and calendar check/uncheck behavior for eligible dates.
- Current and longest streak semantics over scheduled days.
- `HabitChecked` realtime publication and cache invalidation after durable
  persistence.
- Semantic Habit icons and current FluentA design tokens.
- Existing Habit edit, delete, description, empty, loading, and error behavior
  unless this story explicitly changes it.

## Resolved Technical Direction

- Persist Start Date as PostgreSQL `date`, Goal Days as a nullable positive
  integer, and Reminder Time as minute-precision `time without time zone`.
- Delete `habit_entries` and then `habits` inside the forward migration; live
  schema inspection confirms no foreign key expands the approved reset.
- Extend the main owner-scoped Habit response with Total/Longest/current/month
  and goal summaries; do not compute authoritative state only in the browser.
- Serialize per-Habit entry toggles with a PostgreSQL row lock so different-date
  requests cannot cross the finite goal concurrently.
- Run one minute-based due scanner in the current API-hosted Hangfire path,
  evaluate Vietnam-local schedule/time, and retain both durable delivery guards.
- Remove the Stats API/UI route after its required summary fields move to the
  main response, then prove Dashboard/realtime compatibility in the same story.

## Approval Gate

The human approved implementation after D1-D19 and the destructive reset scope
were locked. The implementation and review remained within that approved
boundary.
