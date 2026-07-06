# Overview

## Current Behavior

Flashcard, Practice, and Review product workflows are already separate in the
UI, but backend domain and application contracts still live under the current
`Flashcards` bounded context. `FlashcardService`, `IFlashcardService`,
`IFlashcardRepository`, `FlashcardDtos.cs`, `ReviewTime`, and the Flashcards
domain entity folder currently mix:

- Flashcard deck/card read-model behavior
- Practice settings and practice-session summary behavior
- Review settings, Review sessions, Review answers, dashboard/stats, SRS state,
  SRS history, and FluentA SRS scheduling

Tests mirror this mixed structure: `FlashcardServiceTests` covers Flashcard,
Practice, and Review application behavior, while `VocabularyTests` also covers
Flashcard and Review/SRS domain behavior.

## Target Behavior

Split domain and application contracts into separate Flashcard, Practice, and
Review bounded contexts without changing runtime HTTP behavior, EF mappings, or
frontend calls yet.

After this story:

- Flashcard domain/application contracts own deck/card read-model behavior.
- Practice domain/application contracts own practice settings, practice modes,
  practice summaries, and Practice workflow validation.
- Review domain/application contracts own review settings, Review session
  contracts, Review answer contracts, dashboard/stats contracts, SRS
  state/history, time helpers, and FluentA SRS scheduling.
- Existing controllers and infrastructure may temporarily adapt to the split
  contracts until `US-BC-003` and `US-BC-005` complete the repository and API
  cutovers.

## Affected Users

- Backend maintainers implementing Feature 20.
- Agents and reviewers validating later repository, EF, API, and frontend
  cutover stories.

## Affected Product Docs

- `SPEC.md` Section 20
- `docs/stories/epics/backend-bounded-context-split/US-BC-001-contract-and-ownership-map/contract-map.md`
- `docs/stories/epics/backend-bounded-context-split/epic-map.md`

## Non-Goals

- Splitting `EfFlashcardRepository`.
- Moving tables into PostgreSQL schemas.
- Changing `AppDbContext` DbSets or EF configurations.
- Splitting API controllers or removing legacy routes.
- Updating frontend API calls or Playwright/Vitest endpoint references.
- Changing Practice mode behavior, SRS scheduling, or Review random-mode
  semantics.
- Introducing a shared Learning kernel.
