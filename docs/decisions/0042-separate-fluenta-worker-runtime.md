# 0042 Separate FluentA Worker Runtime

Date: 2026-07-04

## Status

Accepted

## Decision

Move Hangfire server execution and recurring schedule registration out of
`FluentA.API` and into a separate `FluentA.Worker` process. Keep the existing
PostgreSQL-backed Hangfire storage, stable recurring job IDs, cron expressions,
and Application/Infrastructure job implementations.

`FluentA.API` remains the REST and SignalR composition root and starts without
the Worker. `FluentA.Worker` owns `/health/live`, `/health/ready`, the Hangfire
server, and recurring registration for todo carry-over, habit reminders,
countdown alerts, pending asset cleanup, and database cleanup. The Hangfire
dashboard remains disabled.

## Consequences

API availability is no longer coupled to background-job execution. Local and
future deployment environments must run the Worker separately when recurring
jobs are expected to execute. Hangfire continues to share the application
PostgreSQL database, so connection budgets must account for both API and Worker
processes.

This amends decision `0030-hangfire-postgresql-job-runtime.md`: Hangfire still
uses PostgreSQL storage and still does not expose a dashboard, but API startup
is no longer the recurring-job owner.
