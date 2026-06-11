# Overview

## Current Behavior

FluentA has a protected Habit page with a monthly grid, and the backend emits
`HabitChecked` after durable habit-entry toggles. The frontend does not yet
listen for that event, so Habit caches in other open tabs can remain stale until
the user revisits or manually refetches the page.

## Target Behavior

Every authenticated app route listens for `HabitChecked` at the protected route
boundary. When a habit entry changes in one tab, all open authenticated tabs
invalidate Habit and future Dashboard caches, including when a different
protected route is visible.

## Affected Users

- Authenticated learners using FluentA in more than one tab or moving between
  productivity routes.

## Affected Product Docs

- `docs/product/personal-productivity.md`

## Non-Goals

- Dashboard Overview UI or API.
- Dedicated per-habit stats page.
- New Habit backend contract.
- Reminder scheduling, notifications, or background jobs.
