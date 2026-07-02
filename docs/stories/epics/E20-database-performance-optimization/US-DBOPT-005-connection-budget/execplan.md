# Exec Plan

## Goal

Make API and Hangfire database connection usage bounded and configurable.

## Scope

In scope:

- Npgsql connection string normalization.
- Local development settings.
- Hangfire worker cap.
- Documentation of local budget.

Out of scope:

- Production infrastructure provisioning.
- Managed provider pooler configuration.
- Database server parameter changes.

## Risk Classification

Risk flags:

- Existing behavior.
- Runtime configuration.
- Weak proof.

Hard gates:

- None.

Lane: high-risk because runtime DB stability is part of Feature 17.

## Work Phases

1. Inspect current infrastructure registration.
2. Add explicit Npgsql pool and timeout settings.
3. Add Hangfire worker configuration.
4. Build API and collect baseline connection-state evidence.
5. Update Harness records.

## Stop Conditions

Pause for human confirmation if:

- Production connection limits must be changed.
- Hangfire must move to a separate worker process.
- A provider-specific pooler becomes required for local proof.
