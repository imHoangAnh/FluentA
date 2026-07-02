# Validation

## Proof Strategy

Run the collector on local PostgreSQL and keep the generated report in this
story packet. The report must distinguish measurable facts from unavailable
slow-query rankings.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | Not applicable for read-only SQL collection. |
| Integration | Collector runs through Docker Postgres and psql with `ON_ERROR_STOP=1`. |
| E2E | Not applicable. |
| Platform | PowerShell script works from the repo root on Windows. |
| Performance | Report includes EXPLAIN, index inventory, FK audit, table stats, and connection state. |
| Logs/Audit | Harness trace records the report path and pg_stat_statements limitation. |

## Fixtures

- Local `fluenta-postgres` container.
- Current migrated `fluenta_dev` database.

## Commands

```text
.\scripts\database\collect-db-performance-baseline.ps1
```

## Acceptance Evidence

- `.\scripts\database\collect-db-performance-baseline.ps1 -ReportPath docs\stories\epics\E20-database-performance-optimization\US-DBOPT-001-postgres-performance-baseline\baseline-local-20260702-validated.md` passed.
- Baseline report captured PostgreSQL 16.14, `max_connections = 100`,
  connection state, target table stats freshness, target index inventory,
  missing FK-index audit, and representative review/dashboard
  `EXPLAIN (ANALYZE, BUFFERS)` plans.
- `pg_stat_statements` was available as an extension but not installed or
  preloaded locally; slow-query ranking remains unavailable until Postgres is
  restarted with `shared_preload_libraries = 'pg_stat_statements'`.
- Missing FK-index audit returned 0 rows for the current schema.
