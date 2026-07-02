# Design

## Domain Model

No product domain changes.

## Application Flow

Infrastructure startup normalizes the configured Postgres connection string
with explicit Npgsql pooling settings and passes the same bounded connection
string to EF Core and Hangfire PostgreSQL storage. Hangfire server worker count
is set from configuration.

## Interface Contract

No HTTP or frontend changes.

## Data Model

No schema changes.

## UI / Platform Impact

`appsettings.Development.json` documents local defaults:

- `Database:Postgres:MinPoolSize = 0`
- `Database:Postgres:MaxPoolSize = 30`
- `Database:Postgres:ConnectionTimeoutSeconds = 15`
- `Database:Postgres:CommandTimeoutSeconds = 30`
- `Hangfire:WorkerCount = 5`

## Observability

The baseline report captures connection counts grouped by application name and
state.

## Alternatives Considered

1. Leave defaults implicit; rejected because Feature 17 requires a connection
   budget.
2. Add PgBouncer locally; deferred until staging/production concurrency needs
   justify the extra runtime component.
