# 0053 Todo Reminder Scheduling And Notification Navigation

Date: 2026-07-22

## Status

Accepted for `US-TODO-005` after the approved Todo redesign plan and readiness
validation.

## Context

Todo needs one optional reminder whose visible time belongs to the task date,
while delivery must retain the exact instant selected in the browser timezone.
The current executable job host is `FluentA.API`, Notification already has a
durable deduplication key, and the Todo repository already owns authenticated
task lookup and transactional completion behavior.

Stored notification navigation introduces an open-redirect and ownership
boundary. Recurring children and date moves also need a deterministic schedule
when a target calendar time overlaps or does not exist because of DST.

## Decision

1. Persist the reminder wall-clock time, IANA timezone id, resolved UTC instant,
   and sent marker on the Todo row as one optional reminder state.
2. Validate a browser save by converting the supplied UTC instant back through
   the supplied timezone and matching the task date and minute exactly.
3. For server-derived schedules, select the earlier UTC occurrence in a DST
   overlap and shift a nonexistent time forward by the DST gap.
4. Deliver through one API-hosted Hangfire minute scanner that claims database
   rows, creates a deterministically deduped Notification, and marks sent in one
   transaction/save.
5. Store only an optional validated application-relative `actionPath` on a
   Notification. Todo reminders use `/todo?taskId={id}`.
6. Resolve that id through an authenticated owner/deleted-scoped Todo read;
   foreign, deleted, and missing ids share the same not-found response.

## Consequences

- A later device timezone change does not move an already-saved reminder.
- Retried or concurrent scanners cannot intentionally deliver a second row for
  the same task and scheduled instant.
- Recurring occurrences preserve reminder intent without relying on a browser
  being present at generation time.
- Notifications can navigate inside FluentA but cannot store executable
  callbacks or external destinations.

## Alternatives Rejected

- One Hangfire job per reminder: fragile synchronization on edit, completion,
  move, repeat, and delete.
- Store only local time or only UTC: either delivery becomes timezone-dependent
  or the UI loses the user's selected wall-clock value.
- Infer task ownership in the browser: leaks existence and bypasses the API
  boundary.
- Store arbitrary URLs/callbacks: creates an open-redirect or executable-data
  trust boundary.
