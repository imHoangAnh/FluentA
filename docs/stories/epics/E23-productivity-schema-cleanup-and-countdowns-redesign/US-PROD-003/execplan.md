# Exec Plan

## Goal

Close Feature 22 with durable proof that schema cleanup, route cutovers, alert
scheduling, shared-asset linkage, and stale-identifier removal all match the
approved contract.

## Scope

In scope:

- Focused release-proof doc updates.
- Harness matrix evidence for Feature 22 stories.
- Static cleanup scans for removed columns, routes, DTO fields, and UI labels.
- Focused runtime verification across Todo, Kanban, Journal, Countdown, jobs,
  notifications, and shared assets.

Out of scope:

- Net-new product behavior.
- Unrelated full-suite stabilization outside Feature 22 fallout.

## Risk Classification

Risk flags:

- Public contracts
- Existing behavior
- Weak proof
- Multi-domain

Hard gates:

- Removing or weakening validation requirements

## Work Phases

1. Gather changed contracts and migration outputs.
2. Run focused proof ladder and stale-identifier audits.
3. Reconcile product docs, story evidence, and Harness matrix rows.
4. Record trace and any follow-up friction.

## Stop Conditions

Pause for human confirmation if:

- Required proof depends on unavailable infrastructure.
- Cleanup reveals destructive fallout beyond the approved feature boundary.
- A release claim would require skipping planned validation.
