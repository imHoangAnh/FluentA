# Overview

## Current Behavior

FluentA has no Habit Tracker feature. Authenticated learners can manage Todo
tasks and Countdown events, but they cannot create daily/custom habits or mark
habit dates complete.

## Target Behavior

Authenticated learners can create, list, update, soft-delete, and toggle
completion entries for their own daily or custom-schedule habits through the
Habit API. The API enforces validated browser timezone semantics, rejects
future or unscheduled dates, and stores one completion entry per habit/date.

## Affected Users

- Authenticated learners using FluentA for personal study habit tracking.

## Affected Product Docs

- `docs/product/personal-productivity.md`

## Non-Goals

- Monthly contribution grid UI.
- Dedicated stats page.
- Dashboard Overview widget.
- Cross-tab Habit synchronization proof.
- 20:00 reminders, reminder preferences, notification delivery, and background
  jobs.

