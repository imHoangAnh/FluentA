# 0036 FluentA SRS Review Boundary

Date: 2026-07-02

## Status

Accepted

## Context

Feature 16 replaces the old SM-2 review workflow with FluentA SRS. The locked
context requires deterministic levels, explicit Practice `Add to Review`, no
automatic SRS creation from Practice completion, and review history owned by
vocabulary words instead of flashcard-card scheduling metadata.

## Decision

FluentA SRS is the review scheduling boundary:

- Practice completion saves a summary only. `Add to Review` is the only user
  action that creates missing `word_review_states` rows, at `Level 0`, due
  tomorrow in the learner's timezone.
- Review starts from `/review` and uses `/api/v1/review/sessions` plus
  `/api/v1/review` as the public API surface. Existing `/api/v1/flashcards/*`
  review aliases can remain during the transition.
- Review state is queried only as active, owner-scoped `word_review_states`
  linked to active vocabulary words.
- Correct/wrong answers persist one `word_review_histories` row with
  `levelBefore`, `levelAfter`, and `nextReviewDate`; no `nextIntervalDays` or
  SM-2 fields are stored in review history.
- Legacy All Words review history preservation is out of scope for this
  redesign.

## Alternatives Considered

1. Preserve SM-2 fields as the review source of truth. Rejected because Feature
   16 requires deterministic FluentA SRS levels.
2. Auto-create SRS state whenever Practice completes. Rejected because the
   learner must explicitly choose `Add to Review`.
3. Keep `/flashcards/review` as the primary route. Rejected because the current
   learning navigation uses a dedicated top-level `/review` entry point.

## Consequences

Positive:

- Practice, Review, dashboard, and history all read the same dedicated SRS
  state.
- Tests can prove the level ladder and Add-to-Review behavior without relying
  on SM-2 scheduling fields.
- The public Review route and API names match the current product navigation.

Tradeoffs:

- Existing SM-2 review history is not migrated into FluentA SRS history.
- Legacy flashcard-card scheduling columns can remain temporarily as inert
  migration artifacts, but feature behavior must not read them.

## Follow-Up

- Remove remaining stale SM-2-focused Playwright specs after the Feature 16
  regression suite is the default learning proof.
