# Design

## Vertical Slice

Extend the existing Todo aggregate with one optional reminder. The public
request treats the reminder as one atomic nullable object containing `time`
(`HH:mm`), `timeZoneId` (browser IANA id), and `scheduledAtUtc` (the exact UTC
instant resolved by the browser). Omitting the property preserves the current
value; explicit `null` clears it. The Todo projection returns the same fields
plus nullable `sentAtUtc`.

Persist `reminder_time`, `reminder_time_zone_id`,
`reminder_scheduled_at_utc`, and `reminder_sent_at_utc` on `todo_items`. Add a
filtered due-reminder index, but no second reminder table and no external job
per task.

## Timezone And Calendar Contract

The API resolves the submitted IANA timezone on the running host, converts the
submitted UTC instant back through it, and accepts the reminder only when the
resulting local date and minute exactly equal the task date and submitted
`HH:mm`. A missing timezone, malformed time, non-UTC instant, mismatched tuple,
invalid local time, or scheduled instant at or before the current instant is a
field-level validation error.

For a date move or generated recurring occurrence, the server owns the new UTC
calculation from the already-saved wall-clock time and timezone. It follows the
browser-compatible deterministic rules: an overlap uses the earlier UTC
occurrence, while a nonexistent spring-forward time moves forward by the DST
gap. This prevents a calendar mutation from failing while retaining the user's
minute within the shifted wall-clock schedule.

Changing a task date recomputes an existing reminder and resets its sent state.
If the recomputed instant is already past, the move still succeeds, the
reminder is cleared, and the response returns
`warningCode: reminder-cleared-after-date-change`.

## Completion And Recurrence

Completion cancels an unsent reminder on the source occurrence. When Repeat is
enabled, the completion transaction first captures the saved reminder time and
timezone, then creates the next occurrence with a newly calculated instant on
its next date. A sent reminder remains historical on its source; editing or
moving it starts a new delivery cycle.

The existing owner-scoped row lock and completion transaction remain the
atomic boundary for source completion and generated-child creation.

## Delivery And Idempotency

Register one stable API-hosted Hangfire recurring job named `todo-reminders`
with a one-minute cron. The scanner starts a PostgreSQL transaction and claims
a bounded batch of incomplete, non-deleted, due, unsent Todo rows with
`FOR UPDATE SKIP LOCKED`.

For each claimed row it creates one Notification with deterministic key
`todo:{taskId}:reminder:{scheduledUtc}` and marks the reminder sent in the same
save. An existing dedupe notification is treated as recovered prior delivery:
the scanner marks the task sent without inserting a second row. The current
unique `(user_id, deduplication_key)` index remains the final retry backstop.

## Notification Navigation

Add nullable `actionPath` to Notification. Domain validation accepts only a
bounded application-relative path beginning with one `/`; protocol-relative,
absolute, backslash, control-character, and external values are rejected. Todo
notifications store `/todo?taskId={ownedTaskId}`.

Notification rows remain readable when already read. Activating an item first
marks it read when necessary, then navigates only if the client independently
validates the relative path. The Todo route reads the requested id through new
owner-scoped `GET /api/v1/todos/{id}` and opens the shared details panel even
when the task is outside My Day. Foreign, deleted, or missing ids all return
the same not-found response and show one safe message.

## Compatibility And Stop Conditions

- Existing Todo list/create/patch/delete envelopes and ownership rules remain.
- Existing Habit and Countdown notifications keep `actionPath = null`.
- No email, push, SMS, OS notification, multiple reminders, account timezone,
  custom recurrence, arbitrary callback, or external navigation is added.
- Stop if implementation requires a Worker project, a per-reminder Hangfire
  job, an ownership-revealing lookup, or a compatibility-breaking route.
