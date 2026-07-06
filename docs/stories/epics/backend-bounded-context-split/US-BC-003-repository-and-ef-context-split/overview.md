# Overview

## Current Behavior

`US-BC-002` split domain and application contracts, but persistence still flows
through one mixed infrastructure path:

- `IFlashcardRepository` still exposes Flashcard, Practice, and Review methods.
- `EfFlashcardRepository` still owns deck reads, practice writes, review state,
  review sessions, dashboard queries, and random-mode selection.
- `PracticeService` and `ReviewService` still depend on
  `IFlashcardRepository`.
- `DependencyInjection` still registers one mixed repository implementation.
- EF configurations for Flashcard, Practice, and Review entities still live in
  the shared persistence folder without context-owned infrastructure seams.

This means the code compiles and behaves correctly, but the final bounded
context ownership from Feature 20 is not in place yet.

## Target Behavior

Split persistence contracts and EF-backed repository ownership so:

- Flashcard reads are exposed only through `IFlashcardRepository`.
- Practice summary/settings persistence is exposed only through
  `IPracticeRepository`.
- Review settings/session/dashboard/SRS persistence is exposed only through
  `IReviewRepository`.
- Practice reaches Review enrollment only through `IReviewEnrollmentPort`.
- Infrastructure implementations are context-owned and no longer funnel through
  one mixed `EfFlashcardRepository`.
- Public HTTP routes, table names, and runtime behavior remain unchanged in
  this story.

## Affected Users

- Backend maintainers implementing Feature 20.
- Reviewers checking architecture boundaries before controller and frontend
  cutover stories.

## Affected Product Docs

- `SPEC.md` Section 20
- `docs/stories/epics/backend-bounded-context-split/US-BC-001-contract-and-ownership-map/contract-map.md`
- `docs/stories/epics/backend-bounded-context-split/epic-map.md`

## Non-Goals

- Changing public API routes or controller ownership.
- Moving tables into PostgreSQL schemas.
- Creating or editing EF migrations.
- Changing Practice mode behavior, FluentA SRS scheduling, or Review random
  mode semantics.
- Splitting Vocabulary sync/cleanup ownership.
