# Design

## Domain Model

No domain model changes.

## Application Flow

`EfFlashcardRepository.GetDashboardAsync` now composes active card, review
state, and review-history queryables once, then asks Postgres for:

- Total active page-deck cards.
- Active review-state count.
- Overdue and due-today counts.
- Review count and correct-review count.
- Current streak through day-bounded `EXISTS` checks.
- Seven forecast counts through local-day UTC bounds.

## Interface Contract

`FlashcardDashboardDto` is unchanged.

## Data Model

This story uses the indexes from `US-DBOPT-002`.

## UI / Platform Impact

None.

## Observability

The baseline collector has representative EXPLAIN sections for the dashboard
count paths.

## Alternatives Considered

1. Keep materialization and rely only on indexes; rejected because it still
   overfetches growing data.
2. Compute local-day streak with raw PostgreSQL timezone expressions; rejected
   to preserve the existing .NET `TimeZoneInfo` behavior on Windows.
