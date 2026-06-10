# Flashcards

## Product Boundary

This contract currently covers durable vocabulary-to-card synchronization,
review-history persistence, authenticated real-time synchronization
notifications, the read-only deck viewer, Page Deck Active Recall, All Words
SM-2 review, global daily limits, Spaced due queues, board-language
presentation/TTS, and flashcard dashboard statistics.

## Synchronization Rules

- Every active vocabulary word has exactly two cards: one in its Page Deck and
  one in its board's All Words Deck.
- Word creation and card creation succeed or fail in one database transaction.
- Word updates synchronize copied card content while preserving interval, ease
  factor, repetitions, next review date, and card state.
- Word deletion soft-deletes the vocabulary word and hard-deletes both cards
  plus every associated `CardReview`.
- Page and board deletion remove all affected cards and review history.
- Existing active words are backfilled when the synchronization migration is
  applied.

## Card Content

Cards copy the word, class, Vietnamese meaning, secondary meaning, example,
thesaurus, collocation, and note from their source vocabulary word.

## Scheduling Defaults

- New cards start in `New` state.
- Interval and repetitions start at `0`.
- Ease factor starts at `2.5`.
- Next review date starts empty.

## Data Integrity

- A deck cannot contain duplicate cards for the same vocabulary word.
- `CardReview` records belong to one card and are deleted with that card.
- Card-to-word linkage is a soft reference so the source word can remain
  soft-deleted after synchronized cards are removed.

## Real-Time Synchronization

- Authenticated clients connect to `/hubs/sync`.
- JWT query-string authentication is accepted only for the synchronization hub
  path.
- Word create and update publish `VocabWordSaved` with `wordId` and `pageId`.
- Word create, update, and delete publish `FlashcardDeckUpdated` once for each
  affected Page Deck and All Words Deck.
- Events are scoped to the authenticated user and are sent only after the
  durable vocabulary/card commit succeeds.
- Durable card correctness does not depend on connected clients or successful
  notification delivery.

## Read-Only Viewer

- Authenticated learners open `/flashcards` from the vocabulary workspace.
- `GET /api/v1/flashcards/decks` returns only active decks and cards owned by
  the authenticated user, including each deck's board language.
- Decks are grouped by vocabulary board and identify Page Deck versus All Words
  Deck.
- Cards display synchronized vocabulary content and current scheduling status.
- Card labels adapt to board language. Chinese boards show the secondary
  meaning field as Pinyin.
- The viewer invalidates its deck query on `FlashcardDeckUpdated`.
- A 1.5-second refresh fallback covers initial SignalR connection and reconnect
  windows so vocabulary changes remain visible within three seconds.

## Page Deck Active Recall

- Authenticated learners can start a study session from a non-empty Page Deck.
- `GET /api/v1/flashcards/decks/{deckId}/cards` returns only an owned, active
  Page Deck or All Words Deck and its cards.
- Sessions support Normal or Shuffle order, front/answer reveal, best-effort
  automatic and manual TTS that follows board language, progress, and mouse or
  keyboard controls.
- `POST /api/v1/flashcards/sessions` accepts an owned active deck and returns
  a server-generated `sessionId` used by review submissions.
- Space reveals the answer. Keys 1, 2, 3, and 4 record Easy, Good, Hard, and
  Again respectively after reveal.
- `POST /api/v1/flashcards/review` accepts only an owned, active card and
  records one `CardReview`.
- Page Deck ratings snapshot but never change interval, ease factor,
  repetitions, next review date, or card state.
- Completed sessions show an immediate rating summary, and
  `GET /api/v1/flashcards/sessions/{sessionId}/summary` returns the durable
  count and percentage summary from review history for that authenticated user.
- Session order and in-progress UI state remain route-local.

## Multi-language Presentation

- Review sessions use the board language returned by the deck/session APIs.
- TTS maps known board language codes to browser-friendly speech tags:
  `en-US`, `zh-CN`, `ja-JP`, `ko-KR`, and `fr-FR`.
- Browser voice selection prefers exact speech-language matches, then
  base-language matches, then falls back to utterance language only.
- Chinese boards show the secondary card answer as Pinyin in both the
  read-only deck viewer and review answer.

## All Words SM-2 Review

- Learners can start Spaced, Normal, or Shuffle sessions from a non-empty All
  Words Deck. Spaced is the default.
- Every All Words rating updates scheduling, including Normal and Shuffle.
- The server validates the browser timezone and calculates the next review from
  the learner-local review date.
- Again and Hard reset interval to `1` and repetitions to `0`. Good and Easy
  use the deterministic SM-2 progression and ease-factor formula from the
  accepted review contract.
- Resulting card state is Learning below 7 days, Review from 7 through 20 days,
  and Mature from 21 days.
- The card schedule update and matching `CardReview` snapshot commit together.
- A successful All Words commit publishes `FlashcardDeckUpdated` afterward so
  the deck viewer refreshes its visible schedule.

## Global Daily Planning

- Learners configure global new-card and review-card limits on the protected
  review-settings page.
- Missing settings rows use defaults of 20 new cards and 200 review cards.
- Daily limits apply across every All Words deck, not separately per board.
- Every distinct All Words card consumes at most one allowance slot per
  learner-local day, including reviews completed in Normal or Shuffle.
- A card consumes a new-card slot when its first-ever review occurs that day;
  otherwise it consumes a review-card slot.
- `GET /api/v1/flashcards/decks/{deckId}/due` accepts only an owned active All
  Words deck and returns overdue cards first, due-today cards second, and new
  cards third within remaining allowances.
- The server validates the browser timezone and derives local-day UTC bounds.
- Completed Spaced sessions show the immediate daily-completion summary.

## Flashcard Dashboard

- Authenticated learners see dashboard stats on `/flashcards`.
- `GET /api/v1/flashcards/dashboard?timeZoneId=...` returns overall stats for
  the authenticated learner.
- `GET /api/v1/flashcards/dashboard/{boardId}?timeZoneId=...` returns stats
  scoped to one owned board and returns `404` for missing or foreign boards.
- Invalid timezone IDs return `422 VALIDATION_ERROR`.
- Total cards, overdue count, due-today count, new-card count, and the 7-day
  forecast use All Words cards only so each vocabulary word is counted once.
- Streak counts consecutive learner-local days with at least one card review,
  ending today when today has activity or yesterday when today has not started.
- Retention rate is the percentage of reviews rated Good or Easy.
- The forecast returns seven learner-local dates starting today with scheduled
  review counts for each date.
