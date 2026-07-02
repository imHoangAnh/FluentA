# Exec Plan

## Goal

Remove broad in-memory dashboard aggregation without changing dashboard
behavior.

## Scope

In scope:

- Flashcard dashboard query rewrite.
- Reuse of existing `ReviewTime` local-date boundary logic.
- Focused backend/frontend validation.

Out of scope:

- New dashboard endpoint.
- UI redesign.
- Cross-domain productivity dashboard aggregation.

## Risk Classification

Risk flags:

- Existing behavior.
- Public contract.
- Weak proof.

Hard gates:

- None beyond preserving the existing API contract.

Lane: high-risk because it is part of the Feature 17 database initiative.

## Work Phases

1. Identify dashboard overfetching query shape.
2. Expose local-date UTC bounds from `ReviewTime`.
3. Refactor repository aggregation to server-side counts and exists checks.
4. Run backend tests and frontend dashboard route tests.
5. Capture Harness evidence.

## Stop Conditions

Pause for human confirmation if:

- Timezone behavior would need to change.
- Dashboard response fields need new semantics.
- Existing SRS tests fail in a way that implies behavior drift.
