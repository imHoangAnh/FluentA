# Exec Plan

## Goal

Deliver transactional All Words Normal/Shuffle review with deterministic SM-2
scheduling and post-commit deck invalidation.

## Scope

In scope:

- Pure SM-2 scheduling rule and state derivation.
- Learner-local next-review date from a validated browser timezone.
- Generic owned deck session read for Page Deck and All Words.
- Generic review command preserving Page Deck behavior and updating All Words.
- All Words Normal/Shuffle entry and shared review UI.
- Post-commit SignalR invalidation.
- Domain, application, API/PostgreSQL, and browser proof.

Out of scope:

- Spaced mode, due priority, global daily allowances, settings, dashboard, or
  durable session state.

## Risk Classification

Risk flags:

- Authorization.
- Existing scheduling behavior.
- Public API and user-visible workflow.
- Durable transactional records.

Hard gates:

- Ownership.
- Scheduling correctness.
- Atomic card/review persistence.

## Work Phases

1. Add a deterministic pure domain scheduler and table-driven tests.
2. Generalize owned session and review contracts.
3. Apply All Words schedule plus review in one repository commit.
4. Publish post-commit invalidation and reuse the Active Recall UI.
5. Prove formula vectors, timezone dates, ownership, atomic persistence, and
   browser workflow.
6. Update product and Harness evidence.

## Stop Conditions

Pause if the scheduling formula cannot be made deterministic, if timezone
conversion cannot produce a learner-local date safely, or if review insertion
and card mutation cannot share one commit.
