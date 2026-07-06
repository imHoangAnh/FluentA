# Flashcards

## Product Boundary

This document describes the current shipped flashcard and learning behavior in
the repository. The approved end-state redesign contract lives in
`docs/product/learning-workflows.md`. Until all E17 stories are complete, this
file must reflect the implementation truth instead of the final target shape.

## Current Redesign Status

- Legacy `All Words` decks are removed from synchronization, reads, and
  shipped learning flows.
- Every vocabulary page now synchronizes to exactly one Page Deck.
- Dedicated SRS ownership lives in `word_review_states`, linked to
  `VocabWord`.
- Practice completion saves the practice summary first, then lets the learner
  choose `Finish` or `Add to Review`.
- Review submissions read and update dedicated review state instead of mutating
  scheduling fields on `flashcard_cards`.
- Protected navigation now exposes distinct `Flashcard`, `Practice`, and
  `Review` entry points.
- `/flashcards` is the dedicated Flashcard landing page, `/flashcards/practice`
  is the dedicated Practice landing page, and `/review` is the only
  shipped review engine.

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
- Existing active words were backfilled to page-deck-only cards by
  `20260629102903_PurgeLegacyAllWordsDecks`.

## Card Content

Cards copy the word, class, Vietnamese meaning, secondary meaning, example,
thesaurus, collocation, and note from their source vocabulary word.

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

## Flashcard Surface

- `GET /api/v1/flashcards/decks` returns only active Page Decks owned by the
  authenticated user, grouped by vocabulary board.
- The `/flashcards` page is the dedicated Flashcard entry surface and shows
  only page decks grouped by vocabulary board.
- Each non-empty page deck exposes:
  - `Open Flashcards`
  - `Practice this Page Deck`
- Opening Flashcards routes to the one-card read-only viewer for that exact
  page deck.
- The viewer stays owner-scoped, flips one card at a time, and offers
  `Finish` plus `Let's practice` on the final card.

## Practice Surface

- Practice starts from the dedicated `/flashcards/practice` landing page and
  stays scoped to one selected Page Deck.
- `GET /api/v1/flashcards/decks/{deckId}/cards` returns only owned active page
  decks and their cards.
- Practice order can be `Sequential` or `Shuffle`.
- Practice mode sequence is global, unique, and stored in
  `practice_settings`.
- Practice supports Dictation, Meaning -> Word, and Pronunciation in the
  configured order, then always finishes each word with a recap step.
- Wrong answers keep the learner on the current step until correct or reveal.
- Reveal/skip completes that step, marks the word wrong for the session, and
  advances through the remaining workflow.
- `POST /api/v1/practice/sessions` accepts only an owned active page
  deck, validates totals and timezone, and stores the practice summary.
- `POST /api/v1/practice/add-to-review` adds only missing review-state rows for
  the completed deck as FluentA SRS `Level 0`.
- Leaving Practice before completion persists no review-state changes because
  review-state creation happens only when `Add to Review` is chosen.

## Review Surface

- Review starts from the dedicated `/review` route and requires one
  owned vocabulary board.
- `POST /api/v1/review/sessions` creates a server-side session for an owned
  board, selected order type, selected mode, and valid timezone id.
- The created review session returns only due words for that board, plus the
  resolved per-word mode list for the session.
- `POST /api/v1/review` accepts only an owned due `wordId` in the
  live session plus a valid timezone id.
- Review requires existing dedicated review state for the word. In practice,
  that state is created only by `Add to Review`.
- Review updates the dedicated review-state row and inserts one
  `word_review_histories` record immediately per answer.
- Review scoring is automatic: correct advances one FluentA SRS level, wrong
  resets or keeps the word at `Level 0` and schedules tomorrow.
- Review no longer uses Page Deck session summaries or manual rating buttons.

## Dashboard And Settings

- `GET /api/v1/review/dashboard?timeZoneId=...` returns overall stats for
  the authenticated learner.
- `GET /api/v1/review/dashboard/{boardId}?timeZoneId=...` returns stats
  scoped to one owned board and `404`s for missing or foreign boards.
- Dashboard totals derive from page decks plus dedicated review-state rows so
  each vocabulary word is counted once.
- Overdue, due-today, and forecast values come from `word_review_states`.
- New-card count is the number of synchronized page-deck words without review
  state.
- Retention rate is based on persisted `word_review_histories` correct/wrong
  results.
- The protected `/settings` page stores Profile, Practice settings, and Review
  settings in one authenticated screen.
- Practice settings persist the global mode sequence.
- Review settings persist `dailyLimit` and `recapAfterAnswer`.
- Review `dailyLimit` accepts `1-1000` and defaults to `300`.
- When a board has more due words than `dailyLimit`, the oldest due words stay
  in-session and the overflow due dates are moved to tomorrow when the review
  session starts.

## Real-Time Synchronization

- Authenticated clients connect to `/hubs/sync`.
- JWT query-string authentication is accepted only for the synchronization hub
  path.
- Word create and update publish `VocabWordSaved` with `wordId` and `pageId`.
- Word create, update, and delete publish `FlashcardDeckUpdated` for the
  affected page deck.
- Events are scoped to the authenticated user and are sent only after the
  durable vocabulary and flashcard commit succeeds.

## Approved End State

- The shipped split into separate `Flashcard`, `Practice`, and board-scoped
  `Review` workflows is defined in `docs/product/learning-workflows.md`.
- Story-by-story redesign progress and proof live under
  `docs/stories/epics/E17-learning-redesign/`.
