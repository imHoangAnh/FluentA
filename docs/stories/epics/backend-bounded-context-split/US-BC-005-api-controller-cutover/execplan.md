# Exec Plan

## Goal

Cut over backend learning endpoints to context-owned controllers and remove the
legacy mixed Flashcards routes.

## Scope

In scope:

- Create or refactor `FlashcardsController`, `PracticeController`, and
  `ReviewController`.
- Remove legacy mixed learning routes from `FlashcardsController`.
- Keep `SettingsController` only for aggregate profile settings plus any
  surviving non-duplicated settings composition behavior.
- Update backend route tests/build/static scans.

Out of scope:

- Frontend API client rewrites.
- Playwright/Vitest route rewrites.
- Vocabulary sync/cleanup work.
- Full release proof.

## Risk Classification

Risk flags:

- Public API route removal.
- Controller ownership split.
- Frontend tests still referencing removed routes until `US-BC-006`.
- Duplicate settings endpoints must collapse cleanly.

Lane: high-risk.

## Work Phases

1. Inventory current learning routes and assign each to its target controller.
2. Create `PracticeController` and `ReviewController`.
3. Shrink `FlashcardsController` to Flashcard-only reads.
4. Remove legacy compatibility routes.
5. Keep or refine error helpers without reintroducing mixed ownership.
6. Run backend build/tests and static route scans.
7. Update story evidence and trace.

## Stop Conditions

Pause for human confirmation if:

- route cutover requires frontend code changes to keep backend proof runnable
- removing old routes breaks a still-required backend consumer outside planned
  frontend/test cutover
- settings aggregation would need a new mixed learning facade
