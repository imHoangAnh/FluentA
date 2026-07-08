# Exec Plan

## Goal

Ship the Countdown redesign in Feature 22 so the app uses date-based
countdowns, fixed Vietnam-local alert scheduling, and optional shared-asset
cover upload with no legacy edit contract left behind.

## Scope

In scope:

- Countdown product-doc and decision refresh.
- Domain/application/API changes for create/list/delete-only countdowns.
- New alert scheduling persistence and cleanup behavior.
- Shared asset reuse for optional countdown cover upload/finalize/link.
- Frontend route rename to `/countdowns` and create/delete UI redesign.
- Focused backend/frontend/runtime proof for alerts, cover lifecycle, and
  completed visibility/retirement.

Out of scope:

- Habit/dashboard notification redesign.
- Full release audit across removed Todo/Kanban/Journal identifiers.

## Risk Classification

Risk flags:

- Data model
- Public contracts
- Existing behavior
- External systems
- Weak proof
- Multi-domain

Hard gates:

- Data loss or migration
- External provider behavior

## Work Phases

1. Refresh product truth and durable decision record.
2. Replace countdown durable model and scheduling rules.
3. Reuse the shared asset boundary for optional cover finalize/link.
4. Cut frontend route and create/delete-only UX over to the new contract.
5. Verify background-job behavior, cleanup, and focused runtime proof.
6. Update Harness evidence.

## Stop Conditions

Pause for human confirmation if:

- The existing shared asset boundary cannot support countdown-cover ownership
  safely without a broader asset redesign.
- Migration analysis shows ambiguous historical countdown target-time data that
  cannot be mapped to date-only semantics safely.
- Validation requirements would need to weaken.
