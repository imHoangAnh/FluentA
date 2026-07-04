# US-WORKER-001: Worker Runtime Split

## Current Behavior

`FluentA.API` starts the Hangfire server and registers recurring job schedules
inside API startup.

## Target Behavior

`FluentA.Worker` is a separate process that starts Hangfire, registers current
recurring jobs, and exposes `/health/live` plus `/health/ready` on port `5001`.
`FluentA.API` serves REST and SignalR without starting a Hangfire server or
registering schedules.

## Affected Users

- Maintainers running local development.
- Operators deploying API and background jobs separately.
- Learners relying on todos, habits, countdowns, assets, and cleanup jobs.

## Affected Product Docs

- `README.md`
- `docs/ARCHITECTURE.md`
- `docs/product/personal-productivity.md`
- `docs/product/database-performance.md`
- `SPEC.md` section 19

## Non-Goals

- Hangfire dashboard.
- New one-off enqueue API.
- New broker, outbox, or separate Hangfire database/schema.
- Moving job business logic into `FluentA.Worker`.
