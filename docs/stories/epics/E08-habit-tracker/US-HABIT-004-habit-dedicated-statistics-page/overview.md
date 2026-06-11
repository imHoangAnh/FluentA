# Overview

## Current Behavior

FluentA has a protected Habit monthly grid with current streak, today status,
and selected-month completion rate summaries. The accepted Habit context still
requires a dedicated per-habit stats page for deeper statistics.

## Target Behavior

Authenticated learners can open a stats page for one owned habit from the Habit
grid. The page shows the habit schedule, current streak, longest streak, and
completion rates for the last 7 and 30 scheduled days/windows using validated
browser timezone semantics.

## Affected Users

- Authenticated learners tracking recurring study habits.

## Affected Product Docs

- `docs/product/personal-productivity.md`
- `history/spec1-habit-tracker/CONTEXT.md`

## Non-Goals

- Dashboard Overview UI or API.
- Habit reminders, reminder preferences, notification delivery, or background
  jobs.
- New Habit persistence schema or data migration.
