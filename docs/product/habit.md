# Habit

## Accepted behavior

The user approved this scope on 2026-10-08 for the feature-by-feature migration.

- Keep names, descriptions, semantic icons, Daily or custom weekdays, start
  dates, finite check-in goals or Forever, the calendar, and existing statistics.
- Keep check/uncheck rules: no future check-ins, no new check-ins before the
  start date or on unscheduled dates. A completed goal blocks new check-ins;
  unchecking an earlier entry reactivates progress.
- Keep start-date locking after check-in and the existing goal-edit rules.
- Remove reminders from the form, API, domain, database, and scheduler.
- Remove Habit realtime. Refresh the current page's queries after mutations.

## Deletion

- Ask for confirmation before calling DELETE.
- Set only the owned active Habit's `deleted_at` and `updated_at` to UTC now.
- Retain the Habit row and all its check-in rows without changing their values.
- Hide deleted Habits from lists, statistics, and Dashboard. Requests to edit,
  list entries, or toggle a deleted or foreign-owned Habit return not found.
- DELETE returns the normal API response with `data: { deleted: true }`.
  A repeated DELETE returns not found and preserves the first deletion time.
- There is no Trash entry, Undo, restore UI, or automatic purge for Habit.
- Deletion shares the parent-row lock used by check-in so completed deletion
  prevents subsequent check-in changes to retained history.

## Schema

Keep nullable `habits.deleted_at timestamptz`. `HabitSimplification` removes
`reminder_enabled`, `reminder_time`, `last_reminder_sent_on`, and the reminder
index. Existing check-in columns and relationships stay unchanged.
