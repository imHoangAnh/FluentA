# Overview

## Current Behavior

Feature 16 has a locked product context and partial implementation, but the
Harness matrix had no `US-SRS-*` rows and some learning docs/tests still used
old SM-2 or `/flashcards/review` language.

## Target Behavior

FluentA ships a deterministic FluentA SRS release slice:

- Practice summary completion and SRS state creation are separate actions.
- `Add to Review` creates missing Level 0 state only.
- Review applies correct/wrong level transitions and persists history.
- Early, foreign, deleted, or missing review-state mutations are rejected.
- Dashboard and deck surfaces read active, owner-scoped review state.

## Affected Users

- Learners using Practice and Review.
- Maintainers validating learning workflow releases.

## Affected Product Docs

- `SPEC.md`
- `docs/product/flashcards.md`
- `docs/product/learning-workflows.md`
- `docs/decisions/0036-fluenta-srs-review-boundary.md`

## Non-Goals

- Preserving legacy SM-2 review history.
- Reintroducing Easy/Good/Hard/Again ratings.
- Per-mode or confidence-weighted interval changes.
