# Exec Plan

## Goal

Create a repeatable PostgreSQL baseline path for Feature 17 before optimizing
individual query families.

## Scope

In scope:

- Baseline SQL script.
- PowerShell collector.
- Saved local report artifact.
- Harness story/matrix evidence.

Out of scope:

- Production data extraction.
- Mandatory Docker config changes for `pg_stat_statements`.
- Full load test harness.

## Risk Classification

Risk flags:

- Data model.
- Weak proof.
- Multi-domain.

Hard gates:

- Data model and database observability.

Lane: high-risk.

## Work Phases

1. Inspect current DB extension, connection, index, and stats state.
2. Add baseline SQL and PowerShell wrapper.
3. Run collector against local Postgres.
4. Save report under the story packet.
5. Update Harness matrix evidence.

## Stop Conditions

Pause for human confirmation if:

- Baseline collection requires production or personal data export.
- The collector must change container startup settings.
- Validation expectations need to be weakened.
