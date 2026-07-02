# Design

## Domain Model

No product entities change. This story observes existing PostgreSQL tables and
indexes.

## Application Flow

`scripts/database/collect-db-performance-baseline.ps1` pipes
`collect-db-performance-baseline.sql` into the local `fluenta-postgres`
container and writes a timestamped markdown report under this story folder.

## Interface Contract

No HTTP, SignalR, or frontend contract changes.

## Data Model

The baseline script inspects target tables from Review, Flashcards,
Vocabulary, productivity, Journal, Kanban, Pomodoro, and Notification. It does
not mutate application data.

## UI / Platform Impact

Windows PowerShell is the supported local collection path.

## Observability

The report captures:

- `pg_stat_statements` availability and top-query sections when preloaded.
- Connection counts by application name and state.
- Current index list, index size, and index usage counters.
- Missing FK-index audit.
- Table stats freshness.
- Representative `EXPLAIN (ANALYZE, BUFFERS)` plans.

## Alternatives Considered

1. Keep using ad hoc psql commands; rejected because evidence would not remain
   attached to Harness stories.
2. Enable `pg_stat_statements` automatically in Docker; deferred because it
   changes local Postgres startup configuration and needs a separate decision
   if made mandatory.
