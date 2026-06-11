# Overview

## Current Behavior

FluentA has a Habit API foundation, but learners cannot reach a Habit page from
the protected app or use a monthly contribution grid in the browser.

## Target Behavior

Authenticated learners can open the Habit Tracker, create daily or custom
habits, edit or delete existing habits, navigate the current month, and toggle
eligible scheduled dates from a responsive monthly grid. Each row shows the
habit name, schedule, current streak, today status, and monthly completion
rate.

## Affected Users

- Authenticated learners using FluentA for personal study habit tracking.

## Affected Product Docs

- `docs/product/personal-productivity.md`

## Non-Goals

- New Habit database schema or API shape.
- Dedicated per-habit stats API/page for longest streak and 7/30-day rates.
- Dashboard Overview widget.
- Cross-tab Habit synchronization proof.
- 20:00 reminders, reminder preferences, notification delivery, and background
  jobs.
