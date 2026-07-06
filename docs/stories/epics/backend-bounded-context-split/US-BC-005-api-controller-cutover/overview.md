# Overview

## Current Behavior

After `US-BC-004`, backend domain, application, repository, and schema
ownership are split, but the public API layer still routes most learning
behavior through one mixed `FlashcardsController`.

Current controller behavior still mixes:

- Flashcard deck/session reads under `/api/v1/flashcards/...`
- Practice summary creation under `/api/v1/flashcards/practice-sessions`
- Practice Add to Review under absolute `/api/v1/practice/add-to-review`
- Review session start/summary under both target `/api/v1/review/...` and
  legacy `/api/v1/flashcards/sessions...`
- Dashboard under `/api/v1/flashcards/dashboard...`
- Practice settings under both `SettingsController` and legacy
  `/api/v1/flashcards/practice-settings`
- Review settings under both `SettingsController` and legacy
  `/api/v1/flashcards/settings`
- Review submission under both target `/api/v1/review` and legacy
  `/api/v1/flashcards/review`

## Target Behavior

Split API ownership so:

- `FlashcardsController` owns only Flashcard read routes.
- `PracticeController` owns Practice routes.
- `ReviewController` owns Review routes.
- Legacy mixed compatibility routes become unreachable.
- Validation and error behavior remain unchanged for the surviving endpoints.

This story changes public backend routes, but it does not yet update frontend
clients or E2E/Vitest call sites. Those remain the next cutover story.

## Affected Users

- Backend maintainers reviewing the Feature 20 endpoint cutover.
- Reviewers checking that old mixed routes are truly removed.

## Affected Product Docs

- `SPEC.md` Section 20
- `docs/stories/epics/backend-bounded-context-split/US-BC-001-contract-and-ownership-map/contract-map.md`
- `docs/stories/epics/backend-bounded-context-split/epic-map.md`

## Non-Goals

- Frontend API client rewrites.
- Playwright/Vitest test rewrites.
- Vocabulary sync/cleanup ownership work.
- Full release proof.
