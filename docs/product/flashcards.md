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
- Practice completion creates or resets dedicated review state for the words in
  the completed page-deck session.
- Review submissions read and update dedicated review state instead of mutating
  scheduling fields on `flashcard_cards`.
- Protected navigation now exposes distinct `Flashcard`, `Practice`, and
  `Review` entry points.
- `/flashcards` is the dedicated Flashcard landing page, `/flashcards/practice`
  is the dedicated Practice landing page, and `/flashcards/review` is the only
  shipped review engine.

## Synchronization Rules

- Every active vocabulary word has exactly one active synchronized card in its
  owning page deck.
- Word create and synchronized card create succeed or fail in one database
  transaction.
- Word updates synchronize copied card content.
- Word deletion soft-deletes the vocabulary word and hard-deletes the
  synchronized card, its `CardReview` history, and any related
  `word_review_states` row.
- Page and board deletion remove all affected synchronized cards, review
  history, and word review state.
- Existing active words were backfilled to page-deck-only cards by
  `20260629102903_PurgeLegacyAllWordsDecks`.

## Card Content

Cards copy the word, class, Vietnamese meaning, secondary meaning, example,
thesaurus, collocation, and note from their source vocabulary word.

## Dedicated Review State

- `word_review_states` stores interval, ease factor, repetitions,
  `next_review_date`, and state for one vocabulary word.
- New vocabulary words do not create review state automatically.
- Completing Practice for a page deck creates missing review-state rows as
  `Learning` with interval `1`, repetitions `1`, ease factor `2.5`, and next
  review due tomorrow in the learner-local timezone.
- Re-practicing a word resets the existing row back to that same `Learning`
  baseline.
- Review answers apply SM-2 updates to the review-state row and persist a
  matching `CardReview` snapshot.

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
- `POST /api/v1/flashcards/practice-sessions` accepts only an owned active page
  deck, validates totals and timezone, stores the practice summary, and
  creates/resets dedicated review state for all words in the completed deck.
- Leaving Practice before completion persists no review-state changes because
  the batch write only happens at summary submission.

## Review Surface

- Review starts from the dedicated `/flashcards/review` route and requires one
  owned vocabulary board.
- `POST /api/v1/flashcards/sessions` creates a server-side session for an owned
  board, selected order type, selected mode, and valid timezone id.
- The created review session returns only due words for that board, plus the
  resolved per-word mode list for the session.
- `POST /api/v1/flashcards/review` accepts only an owned active card in the
  live session plus a valid timezone id.
- Review requires existing dedicated review state for the card's source word.
  In practice, that state is seeded by completed Practice.
- Review updates the dedicated review-state row and inserts one `CardReview`
  snapshot immediately per answer.
- Review scoring is automatic: correct maps to SM-2 `Good`, wrong maps to
  SM-2 `Again`.
- Review no longer uses Page Deck session summaries or manual rating buttons.

## Dashboard And Settings

- `GET /api/v1/flashcards/dashboard?timeZoneId=...` returns overall stats for
  the authenticated learner.
- `GET /api/v1/flashcards/dashboard/{boardId}?timeZoneId=...` returns stats
  scoped to one owned board and `404`s for missing or foreign boards.
- Dashboard totals derive from page decks plus dedicated review-state rows so
  each vocabulary word is counted once.
- Overdue, due-today, and forecast values come from `word_review_states`.
- New-card count is the number of synchronized page-deck words without review
  state.
- Retention rate is still based on persisted `CardReview` ratings.
- The protected review-settings page now stores separate Practice and Review
  settings.
- Practice settings persist the global mode sequence.
- Review settings persist `dailyLimit` and `recapAfterAnswer`.
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
