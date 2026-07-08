# Exec Plan

## Goal

Ship the non-countdown cleanup half of Feature 22 so Todo, Kanban, and Journal
stop exposing retired schema fields or dependent UI/API behavior.

## Scope

In scope:

- Product-doc refresh for Todo, Kanban, and Journal target behavior.
- Todo contract/schema cleanup for carry-over, reorder, and completion ordering.
- Kanban contract/schema cleanup for tag and search removal.
- Journal contract/schema cleanup for singular naming, `date`, TipTap toolbar,
  and title-only search.
- Focused migration/script review plus backend/frontend regression proof.

Out of scope:

- Countdown alert scheduling and cover upload flow.
- Full release reconciliation across every stale route/test identifier.

## Risk Classification

Risk flags:

- Data model
- Public contracts
- Existing behavior
- Weak proof
- Multi-domain

Hard gates:

- Data loss or migration

## Work Phases

1. Refresh product truth and durable decision record.
2. Remove retired durable fields and rename owned surfaces.
3. Cut API/frontend behavior to the smaller contracts.
4. Review the migration/script and stale-identifier fallout.
5. Run focused backend/frontend validation.
6. Update Harness evidence.

## Stop Conditions

Pause for human confirmation if:

- Existing journal/countdown data needs a destructive migration path that
  cannot be preserved safely.
- Singular Journal route cutover would require a long-lived parallel API
  contract.
- Validation requirements would need to weaken.
