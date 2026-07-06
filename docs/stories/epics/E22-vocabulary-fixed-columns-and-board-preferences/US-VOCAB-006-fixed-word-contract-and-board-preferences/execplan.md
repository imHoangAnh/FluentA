# Exec Plan

## Goal

Ship the backend half of Feature 21 so the repo has a durable fixed vocabulary
word contract and board-preference persistence with no remaining custom-column
API surface.

## Scope

In scope:

- Vocabulary product-contract refresh for backend behavior.
- `VocabWord`, DTO, service, repository, controller, and EF configuration
  changes for fixed fields.
- `vocab_board_preferences` persistence and owner-scoped API support.
- Removal of custom-column/custom-value/column-visibility backend paths.
- Focused backend tests and migration-script proof.

Out of scope:

- Final frontend interaction work for drag reorder and resize UX.
- Full release proof across browser/runtime flows.

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
2. Replace the vocabulary backend contract and persistence model.
3. Generate and review the EF migration/script.
4. Run focused backend validation.
5. Update Harness evidence.

## Stop Conditions

Pause for human confirmation if:

- Real schema contents make the planned migration mapping unsafe.
- Flashcard read contracts need a broader UX/content redesign than Feature 21
  currently states.
- Validation requirements would need to weaken.
