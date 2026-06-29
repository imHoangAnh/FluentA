# 0034 Learning Workflow Redesign Boundary

Date: 2026-06-29

## Status

Accepted

## Context

FluentA's current learning surface mixes read-only flashcard browsing, page
deck active recall, All Words SM-2 review, dashboard metrics, and Feature 13
practice-only sessions under one flashcard-oriented model. Feature 14 changes
product navigation, removes the All Words deck model, and moves SRS ownership
away from `FlashcardCard`.

Keeping those choices only in scratch `history/` files would make the redesign
too easy to reinterpret during implementation. The repo needs one durable
decision that fixes the product and data-ownership boundary before story-level
execution begins.

## Decision

FluentA will treat learning as three separate workflows:

- `Flashcard` is a read-only page-deck viewer.
- `Practice` is the first-learning and re-practice workflow for one selected
  page deck.
- `Review` is the only SRS workflow and operates on due words from one selected
  vocabulary board.

The redesign also adopts these boundary rules:

- All Words decks are removed from the product model.
- SRS state lives in a dedicated review table linked to `VocabWord`.
- Review state is created or reset only from completed Practice sessions and
  updated immediately during Review answers.
- Destructive migration of the superseded All Words review model is acceptable.

## Alternatives Considered

1. Keep All Words decks and add the new UI split on top.
   Rejected because the old data model would still own review semantics and
   leave the redesign partially coupled to the superseded behavior.
2. Keep SRS on `FlashcardCard` and only rename the routes.
   Rejected because Review is approved as a word-level workflow scoped by board,
   not by flashcard deck rows.

## Consequences

Positive:

- Product navigation, data ownership, and validation expectations align around
  the approved Feature 14 behavior.
- Planning can sequence deck-model migration and review-state migration before
  downstream UI work.
- The repo no longer depends on `history/` as the durable source of truth for
  this redesign.

Tradeoffs:

- The migration is destructive for old All Words review data.
- Dashboard and settings surfaces that still assume All Words behavior need
  explicit redesign or removal.
- Feature 13 practice code must be reused carefully because its current
  persistence semantics differ from the new contract.

## Follow-Up

- Create and maintain the Feature 14 epic packet under
  `docs/stories/epics/E17-learning-redesign/`.
- Validate `US-LR-002` before creating execution beads or implementation work.
- Update the decision registry and story matrix rows to match the new feature
  packet.
