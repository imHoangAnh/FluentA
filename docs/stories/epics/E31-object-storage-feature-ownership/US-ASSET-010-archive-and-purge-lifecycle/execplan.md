# US-ASSET-010 Exec Plan

## Goal

Ship archive-ready retention and reliable background purge for all E31 media.

## Scope

In scope: state machine, feature transaction integration, Hangfire registration,
bounded claim/retry, logs, tests.

Out of scope: user-facing archive management.

## Risk Classification

Risk flags: data retention, deletion, external system, concurrency, multi-domain.
Hard gates: data loss and external provider behavior.

## Work Phases

1. Validate transaction and concurrency mechanisms.
2. Implement domain transitions and repository claims.
3. Integrate all three feature detach paths.
4. Register hourly purge and structured logging.
5. Run failure/retry/concurrency and 30-day boundary proof.

## Stop Conditions

- Multiple workers can claim the same row.
- Archived or pending-deletion assets can receive URLs.
- A provider failure can roll back or fail the original feature deletion.

