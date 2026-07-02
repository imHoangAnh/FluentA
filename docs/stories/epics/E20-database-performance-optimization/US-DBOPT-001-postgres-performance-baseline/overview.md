# Overview

## Current Behavior

FluentA uses PostgreSQL for durable product data, but performance evidence was
spread across ad hoc terminal commands. Local Postgres did not preload
`pg_stat_statements`, so slow-query ranking was not available from the current
empty development database.

## Target Behavior

Feature 17 has a repeatable baseline collector that saves a markdown report
with runtime settings, connection state, statistics freshness, index inventory,
FK-index audit, pg_stat_statements availability, and representative review
dashboard EXPLAIN plans.

## Affected Users

- Maintainers planning database optimization.
- Agents validating future DBOPT stories.

## Affected Product Docs

- `docs/product/database-performance.md`
- `SPEC.md` Section 17

## Non-Goals

- Claiming production p95 latency from an empty local database.
- Copying production data into local artifacts.
- Adding indexes without saved query or growth-path evidence.
