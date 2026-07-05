# Exec Plan

## Goal

Ship Feature 19 by moving recurring/background job hosting from `FluentA.API`
to `FluentA.Worker` while preserving existing job behavior.

## Scope

In scope:

- Add `src/backend/FluentA.Worker`.
- Move Hangfire server startup and recurring registration to Worker ownership.
- Remove API Hangfire runtime ownership.
- Add Worker health endpoints and local Compose profile support.
- Update docs, decision records, and Harness evidence.

Out of scope:

- Hangfire dashboard.
- New enqueue APIs.
- Broker or storage replacement.
- Domain or database schema changes.

## Risk Classification

Risk flags:

- Existing behavior.
- Public/runtime contract.
- Weak proof without live Worker smoke.
- Multi-domain background jobs.

Hard gates:

- Runtime architecture change.

Lane: high-risk.

## Work Phases

1. Split DI so shared infrastructure is independent from Hangfire server
   startup.
2. Add Worker composition root, health endpoints, and recurring registration.
3. Remove API registration/server ownership.
4. Add Compose profile and docs/decision/story updates.
5. Run build, tests, live Worker/API smoke, Harness verification, and trace.

## Stop Conditions

Pause for human confirmation if:

- Hangfire storage needs a new database/schema.
- API needs a new enqueue or dashboard surface.
- Existing recurring job IDs or cron expressions need to change.
