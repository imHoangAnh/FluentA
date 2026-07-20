# Flashcards

## Product Boundary

This document describes the current shipped flashcard and learning behavior in
the repository. The approved end-state redesign contract lives in
`docs/product/learning-workflows.md`. Until all E17 stories are complete, this
file reflects implementation truth.

## Current Redesign Status

- Flashcards and Practice use one full-width Board -> Page Deck library. Board
  headers show the Board name and Page Deck count. Both surfaces use the same
  compact centered Page Deck cards, show only Page name and word count, and
  render up to ten columns on a wide desktop.
- A zero-word Page Deck remains visible but cannot open the viewer or Practice.
- Flashcard cards open the existing viewer. Practice cards open a preparation
  dialog rather than starting a session immediately.
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
- `ipaPronunciation` <- vocabulary `ipaPronunciation`
- `meaningVn` <- vocabulary `meaningVn`
- `meaningEn` <- vocabulary `definition`
- `example` <- vocabulary `example`
- `synonyms` <- vocabulary `synonyms`
- `antonyms` <- vocabulary `antonyms`
- `note` <- vocabulary `note`

Empty optional fields stay hidden in the viewer and practice/review recaps.

## Read-Only Viewer Presentation

- The centered responsive Flashcard uses about two thirds of the available
  content width on desktop and the full available content width on smaller
  viewports. Its height stays bounded rather than growing indefinitely.
- The front shows centered `word (class)`, required IPA with exactly one
  surrounding slash pair, and an independent Board-language speaker action.
- The back uses left-aligned italic inline labels in this order:
  `Definition`, `Meaning`, `Example`, optional `Synonyms`, optional `Antonyms`.
- Long content wraps inside the card. Main text reduces from about 16px through
  14px to 12px as content becomes denser; supporting Synonyms and Antonyms use
  smaller text. Internal vertical scrolling is the final fallback.
- The speaker is keyboard accessible and does not flip the card. Clicking the
  rest of the card continues to toggle front and back.
- A temporarily stale API response that lacks required IPA shows an inline
  unavailable message instead of crashing the protected route.

## Dedicated Review State

- `word_review_states` stores `user_id`, `level`, `next_review_date`,
  `lapse_count`, and `last_reviewed_at` for one vocabulary word.
- `next_review_date` and nullable `last_reviewed_at` use PostgreSQL `date` and
  API `yyyy-MM-dd` values. The migration preserves the learner-local Vietnam
  calendar date encoded by existing UTC timestamps; review-history timestamps
  remain unchanged.
- New vocabulary words do not create review state automatically.
- Completing Practice does not create or reset review state by itself.
- `Add to Review` creates missing review-state rows as FluentA SRS `Level 0`
  due tomorrow in the learner-local timezone.
- Re-practicing a word does not reset an existing review-state row.
- Review answers apply FluentA SRS updates to the review-state row and persist
  a matching `word_review_histories` record with before/after levels and the
  next due date.
