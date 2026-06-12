# 0031 Productivity Job Idempotency

Date: 2026-06-12

## Status

Accepted

## Context

Hangfire retries require reminder and countdown jobs to avoid duplicate alerts.

## Decision

Persist the last habit reminder date and countdown alert timestamp. Jobs update
these markers in the same database save as their work and emit structured logs
as the current notification boundary.

## Consequences

Jobs are retry-safe and observable. External delivery and per-habit preference
controls remain separate notification-epic work.
