# Exec Plan

## Goal

Deliver one durable Todo reminder, idempotent in-app notification delivery, and
safe owner-scoped notification navigation after `US-TODO-004`, without adding
Week v2 or Duplicate behavior.

## Risk Classification

Lane: `high-risk`

Risk flags:

- additive Todo and Notification schema/API changes;
- timezone and DST behavior must match on Windows and Linux;
- a retrying minute scanner must never duplicate a notification;
- notification navigation crosses a stored-data trust boundary;
- deep-link reads must not disclose a foreign task;
- completion and recurrence now alter reminder eligibility.

## Implementation Sequence

1. Add domain reminder state and a cross-platform schedule calculator with
   normal, invalid, and ambiguous timezone tests.
2. Extend Todo create/update/read contracts with an atomic optional reminder;
   validate owner/date/time/timezone/UTC round trips and past instants.
3. Recompute or clear reminders during date moves, cancel unsent reminders on
   completion, and copy reminder time/timezone to recurring children.
4. Add owner-scoped `GET /api/v1/todos/{id}` with the existing nondisclosing
   Todo not-found contract.
5. Add optional validated Notification `actionPath`, configure both new schema
   shapes, and scaffold exactly one forward migration after Todo recurrence.
6. Implement the claimed-batch `todo-reminders` scanner and register it in the
   API-hosted Hangfire seam.
7. Add the time-only reminder control to the shared details panel, safe
   notification read-and-navigate behavior, and Todo query-param selection.
8. Update product/runtime documentation and prove unit, migration, live
   PostgreSQL retry, ownership, notification UI, Chromium, and hygiene gates.

## Checkpoints

1. **Timezone:** the exact submitted instant round-trips on Windows and Linux;
   invalid/ambiguous DST cases follow the locked rules.
2. **Lifecycle:** save/clear/move/complete/repeat each preserve or clear the one
   reminder exactly as specified.
3. **Delivery:** two scanner runs against one due reminder yield one
   Notification and one sent marker.
4. **Navigation:** unread and read notifications navigate safely; foreign,
   deleted, and missing task ids do not disclose ownership.
5. **Compatibility:** My Day, current Week, Repeat, Habit notifications, and
   Countdown notifications remain green; Duplicate and Week v2 stay untouched.

## Rollback Shape

Before deployment, revert the story as one unit. After migration deployment,
first ship code that tolerates but no longer uses the additive columns, then
apply a separately reviewed compensating migration. Never edit migration
history or delete reminder/notification rows manually.
