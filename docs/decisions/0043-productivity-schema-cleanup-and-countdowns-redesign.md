# 0043 Productivity Schema Cleanup And Countdowns Redesign

Date: 2026-07-08

## Status

Accepted

## Context

Feature 22 replaces several early productivity contracts that no longer match
the approved product direction. Todo still depends on carry-over and
reordering fields, Kanban still stores tags and title-search behavior, Journal
still exposes plural naming plus preview/content-search storage, and Countdown
still uses a date-time edit flow rather than the new date-based alert model.

The locked feature context also requires Countdown to reuse the shared MinIO
asset lifecycle for one optional cover image and to schedule alerts in fixed
`Asia/Ho_Chi_Minh` business rules without introducing per-user timezone
settings.

## Decision

FluentA will implement Feature 22 with three coordinated boundaries:

1. Todo, Kanban, and Journal remove retired schema fields and any dependent
   API/frontend behavior instead of keeping compatibility-first shims.
2. Countdown moves to a create/delete-only contract with:
   - `target_date` as a date-only user concept
   - one to five alerts chosen from `OnTargetDay`, `1DayBefore`,
     `3DaysBefore`, and `7DaysBefore`
   - fixed Vietnam-local alert-time scheduling persisted as
     `scheduled_at_utc`
   - seven-day completed visibility followed by automatic retirement
3. Countdown may link one optional finalized shared asset as a cover image
   during create, and the same lifecycle retires that cover on manual delete or
   seven-day auto-retirement.

Journal naming should become singular where reasonable (`/journal`,
`/api/v1/journal`), and synchronized renames such as
`journal_entries -> journal` and `countdown_events -> countdowns` should happen
across durable model, API, and UI when the migration path is safe.

## Alternatives Considered

1. Keep old productivity fields and narrow only the visible UI.
   Rejected because the feature is explicitly a schema cleanup and stale logic
   would continue leaking into APIs, tests, and future migrations.
2. Keep Countdown edit support and single-alert completion behavior.
   Rejected because locked Feature 22 decisions replace the entire workflow with
   create/delete-only date-based alerts.
3. Add a profile timezone setting for Countdown.
   Rejected because the feature is Vietnam-only and the locked contract fixes
   `Asia/Ho_Chi_Minh`.

## Consequences

Positive:

- Product truth and durable model align again across Todo, Kanban, Journal,
  Countdown, and shared assets.
- Future productivity work starts from smaller, cleaner contracts.
- Countdown reminders gain explicit scheduling data and reusable asset support.

Tradeoffs:

- The cutover requires coordinated migration, route, DTO, and UI cleanup across
  multiple domains in one feature.
- Historical Countdown target-time data may need careful migration handling
  because the target concept becomes date-only.
- Release proof must include static cleanup evidence, not just happy-path tests.

## Follow-Up

- Implement `US-PROD-001`, `US-PROD-002`, and `US-PROD-003`.
- Review the final EF migration for safe renames and retained historical data.
- Update Harness matrix evidence and focused proof once implementation lands.
