# Exec Plan

## Goal

Complete SPEC.md US-018 Flash Card Dashboard.

## Scope

In scope:

- Overall and board-scoped dashboard API endpoints.
- Timezone-aware streak and forecast calculations.
- Flashcards page dashboard UI.
- Unit and E2E proof.

Out of scope:

- Persisted analytics tables.
- Full dashboard overview for non-flashcard productivity modules.

## Risk Classification

Risk flags:

- Public contracts.
- Existing behavior.

Hard gates:

- None.

## Work Phases

1. Define dashboard DTO and service/repository contract.
2. Implement EF read model from active owned cards/reviews.
3. Render dashboard stats and forecast on `/flashcards`.
4. Add tests and browser proof.
5. Update Harness records.

## Stop Conditions

Pause if dashboard query performance requires schema/index changes or if product definitions for retention/streak need to change.
