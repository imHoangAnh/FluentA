# 0051 Date-Only Review State

Date: 2026-07-20

## Status

Accepted

## Context

FluentA SRS schedules whole learner-local calendar days, but
`word_review_states.next_review_date` and `last_reviewed_at` are stored as UTC
timestamps. The time component has no product meaning and makes date display
and comparisons unnecessarily timezone-sensitive.

The live database contains four current due dates at
`2026-07-20 17:00:00Z`, which represent `2026-07-21` in
`Asia/Ho_Chi_Minh`. A direct UTC date cast would make every current word due one
day early.

## Decision

The two review-state properties and columns become `DateOnly`/PostgreSQL
`date`. Scheduling derives a local calendar date from the timezone supplied by
the request and compares dates directly.

The one-time migration converts existing review-state values through
`Asia/Ho_Chi_Minh` before casting to date. Review history timestamps and its
legacy next-review timestamp remain unchanged.

## Alternatives Considered

1. Keep timestamps and format only the UI. Rejected because storage would still
   represent a date rule as an instant.
2. Cast the UTC timestamp directly to date. Rejected because live proof shows a
   one-day data regression.
3. Convert by each user's saved timezone. Rejected because the current data
   model does not persist a user timezone.

## Consequences

Positive:

- Review state matches the calendar-day SRS contract.
- API values become stable `yyyy-MM-dd` dates.
- Due/overdue/forecast queries become direct date predicates.

Tradeoffs:

- Removed time-of-day precision cannot be reconstructed by a rollback.
- The backfill is intentionally tied to the proven current Vietnam dataset.
- History retains its existing timestamp compatibility boundary.

## Follow-Up

- Add migration before/after SQL proof to `US-PR-001/validation.md`.
- Consider a separately approved persisted profile timezone if FluentA becomes
  a multi-timezone product.
