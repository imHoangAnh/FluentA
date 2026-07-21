# Overview

## Dependency

Starts only after `US-TODO-004` is implemented and reviewed.

## Target Behavior

The shared Todo detail panel can save or clear one time-only reminder whose date
is the task date. The browser timezone and browser-resolved UTC instant are
captured and validated at save time, so later timezone changes do not move the
scheduled instant.

The API-hosted Hangfire minute scanner delivers one durable in-app Notification
when due. Completion cancels an unsent reminder; a date move that makes it past
clears it and warns; a new recurring occurrence receives the copied reminder
time on its new date. Selecting the notification marks it read, opens `/todo`,
and selects the owned task detail even when the task is not in today's list.

## Required Boundaries

- Exact owner/date/time/timezone/UTC round-trip validation.
- One database-backed scanner, not one external job per task.
- Notification creation and sent marker in one save with deterministic dedupe.
- Safe optional relative notification action path; no external URL or stored
  executable callback.
- Owner-nondisclosing by-id Todo read for deep-link selection.
- Unit, live PostgreSQL/job retry, notification UI, and Chromium proof.

## Non-Goals

- Email, push, SMS, or operating-system notifications.
- Multiple reminders.
- Account-level timezone preferences.
- Custom recurrence.
