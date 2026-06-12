# 0030 Hangfire PostgreSQL Job Runtime

Date: 2026-06-12

## Status

Accepted

## Decision

Use Hangfire with the existing PostgreSQL database for recurring SPEC1 jobs.
Register stable recurring-job IDs at API startup and do not expose a public
Hangfire dashboard.

## Consequences

Job schedules and execution state survive API restarts without adding another
operational datastore.
