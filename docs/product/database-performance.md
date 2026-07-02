# Database Performance

## Product Boundary

This contract defines the non-visible database performance rules for FluentA.
It does not change product workflows, API response shapes, authorization, data
ownership, or soft-delete retention.

## Performance Targets

- Interactive API paths should stay under the existing local/staging p95 target
  of 300 ms for representative workloads.
- Optimization work must start from saved evidence: `pg_stat_statements`,
  `EXPLAIN (ANALYZE, BUFFERS)`, index inventory, FK-index audit, connection
  state, and table statistics freshness.
- Empty local databases can prove migration shape and query plans, but cannot
  prove final latency targets.

## Query And Index Rules

- User-owned queries must keep owner and active-row filters before returning
  data.
- Hot active-row queries should prefer partial indexes with
  `deleted_at IS NULL` when the predicate is stable.
- Composite indexes place equality columns before range and sort columns.
- FK-side indexes are required for joins, cascades, cleanup, and ownership
  checks.
- Covering indexes are allowed only when saved plans show heap fetches are the
  bottleneck.
- Duplicate broad indexes should not be added just to hide inefficient data
  access patterns.

## Data Access Rules

- Read-only EF queries use `AsNoTracking()`.
- Growing dashboard, history, inbox, and due-queue paths use server-side
  counts, filters, grouping, and bounded result sets before materialization.
- Batch joins or `Contains` queries replace per-row follow-up queries.
- Deep offset pagination is avoided for growing feeds; cursor/keyset pagination
  is preferred when pagination becomes necessary.

## Connection Budget

Local development defaults:

- PostgreSQL `max_connections`: 100 from the development container.
- FluentA API Npgsql pool: minimum 0, maximum 30.
- Npgsql connection timeout: 15 seconds.
- Npgsql command timeout: 30 seconds for normal runtime commands.
- Hangfire worker count: 5.

Staging and production must set equivalent values through configuration or
environment variables before load testing. Supabase or other managed Postgres
deployments should use the provider-recommended pooler for high concurrency.

## Baseline Collection

Use:

```powershell
.\scripts\database\collect-db-performance-baseline.ps1
```

The script writes a markdown report under the DBOPT story packet and captures:

- `pg_stat_statements` availability and top queries when preloaded.
- Connection counts by state and application name.
- Target table statistics freshness.
- Target index inventory, sizes, and usage counters.
- Missing FK-index audit.
- Representative `EXPLAIN (ANALYZE, BUFFERS)` plans for review/dashboard
  paths.

If `pg_stat_statements` is unavailable, the report must say so and the release
proof cannot claim slow-query ranking until the extension is preloaded and
queried on a representative workload.
