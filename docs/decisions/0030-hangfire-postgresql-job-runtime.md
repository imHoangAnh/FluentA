# 0030 Hangfire PostgreSQL Job Runtime

Date: 2026-06-12

## Status

Accepted; amended by `0042-separate-fluenta-worker-runtime.md`

## Decision

Use Hangfire with the existing PostgreSQL database for recurring SPEC1 jobs.
Register stable recurring-job IDs at API startup and do not expose a public
Hangfire dashboard.

Decision `0042-separate-fluenta-worker-runtime.md` keeps PostgreSQL storage and
the disabled dashboard rule, but moves Hangfire server execution and recurring
registration from API startup to `FluentA.Worker`.

## Consequences

Job schedules and execution state survive API restarts without adding another
operational datastore.
