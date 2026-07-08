# Design

## Domain Model

- No new domain capability is introduced here; this story verifies the final
  shape produced by `US-PROD-001` and `US-PROD-002`.

## Application Flow

- Run the focused Feature 22 proof ladder.
- Audit backend, frontend, tests, and migrations for stale identifiers such as
  `is_carried_over`, `original_date`, `tags`, `plain_text_content`,
  `/api/v1/journals`, and `/countdown`.
- Reconcile any story-level verification command or product-doc drift before
  closing the feature.

## Interface Contract

- Confirm only the target Feature 22 routes, DTO fields, and UI labels remain
  exposed.

## Data Model

- Confirm the final migration/script removes or renames the intended Todo,
  Kanban, Journal, and Countdown durable fields/tables exactly once.

## UI / Platform Impact

- Confirm Todo week planning, Kanban board flows, Journal editor/calendar, and
  Countdown create/delete flows still work under the narrower contracts.

## Observability

- Proof must inspect logs, notifications, and cleanup outcomes where the new
  Countdown alert and cover-retirement paths run asynchronously.

## Alternatives Considered

1. Rely only on compile/test green status without a stale-identifier audit.
   Rejected because Feature 22 is explicitly a cleanup feature and must prove
   the old contract is gone, not just unused by happy-path tests.
