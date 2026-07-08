# Overview

## Current Behavior

Flashcard and Practice still use synchronized `flashcard_decks` and
`flashcard_cards` as their read model. The frontend routes, API DTOs, and
practice persistence all center `deckId`, even though the approved product
contract now treats each `vocab_page` as the learner-facing unit and requires
live reads from `vocab_words`.

## Target Behavior

Flashcard and Practice become page-based flows. The Flashcard list groups
boards and pages from live vocabulary ownership, page sessions read active
words directly, and Practice entry/setup uses the same page-scoped contract.
The slice preserves current Practice settings and session UI where possible,
but removes deck-first naming and deck/card read dependencies from the active
Flashcard and Practice paths.

## Affected Users

- Authenticated learner using Flashcard or Practice.

## Affected Product Docs

- `docs/product/flashcards.md`
- `docs/product/learning-workflows.md`
- `docs/product/vocabulary-board.md`

## Non-Goals

- Rebuilding Review queue/state ownership.
- Final practiced badge persistence and recap-time per-word Add to Review.
- Removing legacy deck/card tables from the database in this first slice.
