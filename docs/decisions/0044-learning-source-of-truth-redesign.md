# 0044 Learning Source-Of-Truth Redesign

Date: 2026-07-08

## Status

Accepted

## Context

Feature 23 replaces the remaining synchronized learning ownership model built
around `flashcard_decks` and `flashcard_cards`. The current implementation
still reads Flashcard and Practice sessions from those duplicate tables, keeps
Practice persistence keyed by deck ids, and leaks deck-first terminology and
routes through the frontend and API contracts.

The approved Feature 23 contract makes `vocab_words` the only source of truth
for Flashcard, Practice, and Review content. Flashcard and Practice become
page-scoped readers over live vocabulary data, while Review keeps its own
dedicated board-scoped SRS state linked directly to `vocab_words`.

## Decision

FluentA will implement Feature 23 in five coordinated boundaries:

1. Flashcard and Practice read directly from active vocabulary pages and words
   instead of synchronized deck/card tables.
2. Page-scoped learning routes, DTOs, and API contracts use `pageId` naming
   instead of `deckId` where the user is selecting a vocabulary page.
3. Practice completion and practiced-state persistence become page-owned
   records rather than deck-owned summaries.
4. Review will later move to `review_state`, `review_sessions`, and
   `review_session_items` linked directly to `vocab_words`.
5. Legacy synchronized deck/card storage, old practice-summary history, and
   per-answer review-history behavior will be removed once replacement flows
   are fully proven.

## Alternatives Considered

1. Keep `flashcard_decks` and `flashcard_cards` as read-optimized projections.
   Rejected because the feature explicitly removes duplicated learning content
   ownership, and compatibility layers would keep stale source-of-truth logic
   alive across APIs, migrations, and tests.
2. Convert only Review and leave Flashcard and Practice deck-based.
   Rejected because the approved contract makes `vocab_page` the learner-facing
   unit for both Flashcard and Practice.
3. Preserve old route and DTO names while switching internals.
   Rejected because `deck` semantics would continue to misrepresent the new
   page-word model and make later cleanup riskier.

## Consequences

Positive:

- Learning content ownership becomes aligned across backend, frontend, and
  product docs.
- Future review-state and cleanup work can target one vocabulary-centric model
  instead of dual synchronized stores.
- Flashcard and Practice will always reflect the latest live board, page, and
  word content.

Tradeoffs:

- The cutover touches data model, API naming, frontend routes, tests, and
  story proof in one coordinated initiative.
- Intermediate slices must carefully coexist with still-live review flows until
  later Feature 23 stories land.
- Migration and stale-identifier cleanup become mandatory release work, not
  optional polish.

## Follow-Up

- Implement `US-LEARN-001` through `US-LEARN-005`.
- Update the learning product docs as each slice lands.
- Replace remaining deck/card-based review and cleanup code before closing the
  feature.
