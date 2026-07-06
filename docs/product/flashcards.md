# Flashcards

## Product Boundary

This document describes the current shipped flashcard and learning behavior in
the repository. The approved end-state redesign contract lives in
`docs/product/learning-workflows.md`. Until all E17 stories are complete, this
file reflects implementation truth.

## Current Redesign Status

- Legacy `All Words` decks are removed from synchronization, reads, and
  shipped learning flows.
- Every vocabulary page now synchronizes to exactly one Page Deck.
- Dedicated SRS ownership lives in `word_review_states`, linked to `VocabWord`.
- Practice completion saves the practice summary first, then lets the learner
  choose `Finish` or `Add to Review`.
- Review submissions read and update dedicated review state instead of mutating
  scheduling fields on `flashcard_cards`.
- Protected navigation exposes distinct `Flashcard`, `Practice`, and `Review`
  entry points.

## Synchronization Rules

- Every active vocabulary word has exactly one active synchronized card in its
  owning page deck.
- Word create and synchronized card create succeed or fail in one database
  transaction.
- Word updates synchronize copied card content.
- Word deletion soft-deletes the vocabulary word and hard-deletes the
  synchronized card, any related `word_review_states` row, and any related
  `word_review_histories` rows.
- Page and board deletion remove all affected synchronized cards, review
  history, and word review state.

## Card Content

Cards still expose the existing flashcard surface fields, but their source
vocabulary mapping is now:

- `word` <- vocabulary `word`
- `wordClass` <- vocabulary `class`
- `meaningVn` <- vocabulary `meaningVn`
- `meaningEn` <- vocabulary `definition`
- `example` <- vocabulary `example`
- `thesaurus` <- vocabulary `synonyms`
- `collocation` <- vocabulary `antonyms`
- `note` <- vocabulary `note`

Empty optional fields stay hidden in the viewer and practice/review recaps.

## Dedicated Review State

- `word_review_states` stores `user_id`, `level`, `next_review_date`,
  `lapse_count`, and `last_reviewed_at` for one vocabulary word.
- New vocabulary words do not create review state automatically.
- Completing Practice does not create or reset review state by itself.
- `Add to Review` creates missing review-state rows as FluentA SRS `Level 0`
  due tomorrow in the learner-local timezone.
- Re-practicing a word does not reset an existing review-state row.
- Review answers apply FluentA SRS updates to the review-state row and persist
  a matching `word_review_histories` record with before/after levels and the
  next due date.
