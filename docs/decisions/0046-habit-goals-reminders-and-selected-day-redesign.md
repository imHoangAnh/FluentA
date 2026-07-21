# 0046 Habit Goals, Reminders, And Selected-Day Redesign

Date: 2026-07-21

## Status

Accepted

## Context

The current Habit Tracker renders seven completion cells in every list row,
stores no explicit Start Date or successful-check-in goal, runs reminder logic
once per day using UTC date semantics, and exposes a separate Habit Stats route.
The approved redesign uses one selected date, aggregate daily progress, finite
or Forever goals, one custom Vietnam-local reminder time, and the main detail
panel as the only statistics surface.

The human explicitly approved resetting all Habit and HabitEntry data during
this migration. This is a new migration boundary and supersedes only the
non-destructive Habit cleanup assumption recorded for the earlier semantic-icon
migration in decision 0045; the semantic icon and color-removal decisions remain
in force.

## Decision

1. Add required Start Date, nullable positive Goal Days, and one required local
   Reminder Time to each Habit. Null Goal Days means Forever; finite goals count
   successful eligible check-in dates, not calendar duration or consecutive
   streak days.
2. Derive goal completion from durable HabitEntry rows. A completed finite goal
   stops new check-ins but remains visible; unchecking below the goal reactivates
   it.
3. Interpret every reminder in fixed `Asia/Ho_Chi_Minh` time. Use one minute
   scanner with the existing date marker and owner-scoped notification dedupe
   key instead of per-Habit recurring jobs.
4. Serialize concurrent toggles for one Habit at the persistence boundary so
   different dates cannot exceed the finite goal.
5. Replace per-row weekly cells with one selected-date check action and an
   aggregate Monday-Sunday progress strip. Keep current FluentA colors,
   semantic icons, edit/delete behavior, description, and monthly calendar.
6. Remove the dedicated Habit Stats API/UI route. Return Total check-ins,
   Current streak, Longest streak, monthly rate, and goal state through the main
   Habit summary contract.
7. The migration explicitly deletes all HabitEntry and Habit rows and no other
   product rows. Rollback cannot restore those rows; recovery requires a
   database backup.

## Alternatives Considered

1. Preserve and backfill current Habit data. Rejected by the approved full
   Habit/HabitEntry reset.
2. Treat Goal Days as elapsed calendar duration or a consecutive streak.
   Rejected because the approved goal counts successful check-in dates.
3. Store a timezone per Habit. Rejected because the approved reminder business
   timezone is fixed to Vietnam.
4. Register one Hangfire recurring job per Habit. Rejected because a single
   indexed scanner is easier to reconcile, retry, and clean up.
5. Retain the Stats route as an alias. Rejected because the approved main panel
   is the only statistics surface.

## Consequences

Positive:

- Goal, eligibility, Dashboard, reminder, and UI behavior share one durable
  server-authoritative interpretation.
- The selected-day layout matches the supplied interaction reference without
  importing its unrelated color, Section, Goal type, Auto pop-up, or Habit Log
  concepts.
- Reminder retries remain deduplicated while supporting custom local minutes.

Tradeoffs:

- Applying the migration irreversibly removes existing Habit history unless a
  backup exists.
- The Habit public contract changes and the Stats route is intentionally
  removed.
- Minute recurrence increases job polling frequency and requires an indexed,
  bounded candidate query.
- Finite-goal concurrency needs explicit transactional proof beyond the current
  unique Habit/date index.

## Follow-Up

- Prove the exact deletion boundary and new constraints against live
  PostgreSQL before release.
- Update `docs/product/personal-productivity.md`, the Harness story row, and
  validation evidence with the shipped contract.
- Keep reminder delivery in-app only unless a separately approved initiative
  adds external delivery.
