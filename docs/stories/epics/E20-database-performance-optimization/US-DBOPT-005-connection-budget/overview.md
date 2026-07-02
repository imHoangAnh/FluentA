# Overview

## Current Behavior

The API and Hangfire used the default Npgsql pooling behavior and default
Hangfire server worker count. The connection budget was implicit.

## Target Behavior

Local development has explicit Postgres pool and Hangfire worker settings that
can be overridden by configuration or environment variables.

## Affected Users

- Maintainers running local API and background jobs.
- Operators preparing staging/production config.

## Affected Product Docs

- `docs/product/database-performance.md`
- `docs/ARCHITECTURE.md`

## Non-Goals

- Changing database server `max_connections`.
- Adding PgBouncer or a managed pooler.
- Tuning production from local empty-database evidence.
