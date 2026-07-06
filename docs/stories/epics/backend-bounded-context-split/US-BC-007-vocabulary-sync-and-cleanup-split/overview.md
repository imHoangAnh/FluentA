# Overview

## Current Behavior

After `US-BC-006`, the backend route split is in place, but Vocabulary still
owns cross-context learning side effects through its repository:

- page creation also creates Flashcard decks directly from Vocabulary
- word create/update/delete also creates, updates, or removes Flashcard cards
- board/page/word deletion also removes Review progress directly from
  Vocabulary infrastructure code
- Review cleanup only removed `WordReviewState`, while product docs expect
  review history cleanup too

This leaves Vocabulary coupled to Flashcard and Review persistence details even
after the bounded-context split.

## Target Behavior

Vocabulary remains the source of truth for boards, pages, and words, but
cross-context side effects move behind context-owned application ports:

- Flashcard owns page-deck lifecycle and card synchronization
- Review owns review-state and review-history cleanup
- Vocabulary orchestrates these calls synchronously in-process so the existing
  atomic commit behavior stays intact
- `EfVocabularyRepository` no longer imports Flashcard or Review entities

## Affected Users

- backend maintainers working on learning-domain ownership boundaries
- reviewers validating that Vocabulary no longer reaches into Flashcard and
  Review persistence internals

## Affected Product Docs

- `SPEC.md` Section 20
- `docs/stories/epics/backend-bounded-context-split/epic-map.md`
- `docs/stories/epics/backend-bounded-context-split/US-BC-001-contract-and-ownership-map/contract-map.md`
- `docs/product/flashcards.md`

## Non-Goals

- changing external API routes
- redesigning review scheduling or practice behavior
- extracting independent deployable services
- full release proof for Feature 20
