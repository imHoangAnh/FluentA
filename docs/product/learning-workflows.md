# Learning Workflows

## Product Boundary

FluentA's learning surface is split into three top-level workflows:
`Flashcard`, `Practice`, and `Review`. This contract defines the approved
target behavior for that split and the data ownership rules that support it.

## Navigation Split

- The protected learning navigation exposes separate `Flashcard`, `Practice`,
  and `Review` menu items.
- The first-learning workflow is named `Practice`.
- The product language for SRS work uses `word`, not `card`.

## Flashcard

- Flashcard is a read-only page-deck viewer.
- The initial Flashcard view shows only page decks grouped by vocabulary board
  and page. It does not list every word inline.
- Selecting a page deck opens a one-card-at-a-time viewer.
- Learners flip the current card by clicking it and move with manual
  Next/Previous controls.
- The final card offers `Finish` and `Let's practice`. `Let's practice`
  redirects to Practice for that exact page deck.
- Card front shows centered `word (class)`, required slash-normalized IPA, and
  an independent Board-language speaker action.
- Card back shows italic inline labels and values in this order: optional
  `Definition` (`meaningEn`), `Meaning` (`meaningVn`), `Example`, optional
  `Synonyms` (`synonyms`), and optional `Antonyms` (`antonyms`).
- The responsive rectangular card stays bounded, wraps long content, reduces
  text density before using internal vertical scrolling, and never introduces
  horizontal content overflow.
- Empty optional fields are hidden.

## Practice

- Practice library route is `/practice`; its active session route is
  `/practice/:pageId`.
- Practice runs on one selected page deck chosen from the full-width Board ->
  Page Deck selection flow. An external Page Deck action uses
  `/practice?deck=:pageId`, which opens that Page Deck's preparation dialog
  after its Board data loads; closing the dialog returns to `/practice`.
- Flashcards and Practice Page Deck cards share the same compact presentation,
  center the Page name and word count, and render ten columns on a wide
  desktop. Tablet and mobile reduce the column count without horizontal
  overflow; only the enabled-card action differs between the two libraries.
- The preparation dialog defaults to Sequential each time, offers Shuffle, and
  shows the ordered configured Practice mode names. Its single Start action
  navigates to `/practice/:pageId?order=sequential|shuffle` and starts the
  active session directly. Refresh preserves that order; missing or invalid
  order is Sequential.
- Practice includes every word in the selected page deck, including words that
  already have review state.
- Practice supports `Sequential` and `Shuffle` word order.
- Sequential follows current deck/card creation order.
- Shuffle randomizes within that selected deck.
- Practice uses a global user setting for the mode sequence.
- The mode sequence must contain at least one unique mode from Dictation,
  Meaning -> Word, and Pronunciation.
- The default mode sequence is Dictation -> Meaning -> Word -> Pronunciation.
- Each word must complete the configured mode sequence, then a Flashcard recap,
  before moving to the next word.
- The recap is always last, cannot be disabled, and cannot be reordered.
- Wrong answers stay on the current step until the learner answers correctly
  or uses skip/reveal.
- Skip/reveal completes the current step.
- Typed submissions show only `Correct` or `Wrong`; they do not reveal a
  detailed answer panel between the exercise and recap.
- Pronunciation records at most five seconds of microphone audio as 16-kHz,
  16-bit, mono PCM WAV and sends it to an authenticated FluentA endpoint. The
  backend resolves the owned target word and Board language, calls Azure
  Pronunciation Assessment, and treats `AccuracyScore >= 70` as Correct.
- Practice Pronunciation permits two assessed attempts. Two Wrong results show
  `Retry` and `Skip`; Retry grants one fresh pair of two attempts. Microphone,
  invalid-audio, timeout, quota, throttling, and provider failures consume no
  attempt. The UI never displays an Azure score or transcript.
- The final recap is a centered rounded panel showing `word (class)` with its
  speaker action, slash-normalized IPA, Definition, Meaning, and Example in
  that order. Labels are italic, long content wraps, and Synonyms/Antonyms are
  omitted.
- Practice tracks completion in the UI during the session. After the full
  page-deck session finishes, the learner chooses `Finish` or `Add to Review`.
- `Finish` saves the practice summary without creating new review state.
- `Add to Review` creates missing review state as FluentA SRS `Level 0`, due
  tomorrow.
- Re-practicing a word that already has review state leaves its SRS unchanged.
- Leaving Practice before the session finishes persists no review-state
  changes.

## Review

- Review is the only SRS workflow.
- Review starts from one selected vocabulary board, not from a flashcard deck.
- Review builds a due-word queue from that board's vocabulary pages.
- Only words due today or overdue enter the queue.
- Review supports `Sequential` and `Shuffle` queue order.
- Sequential sorts by oldest `nextReviewDate` first, then creation order.
- Shuffle first selects the oldest-due limited set, then shuffles within it.
- Review asks the learner to choose one mode per session: Dictation,
  Pronunciation, Meaning -> Word, or Random.
- Random keeps the chosen word order and randomizes only the mode assigned to
  each word.
- Review uses automatic correct/wrong results. It does not show
  Easy/Good/Hard/Again buttons.
- Typed Review modes receive one normalized exact-match submission.
- Review Pronunciation receives two assessed attempts. The first Wrong permits
  one more recording; the second Wrong persists immediately and always opens
  recap. Review has no pronunciation Retry or Skip. Technical/provider errors
  consume no attempt and persist no result.
- Submission feedback contains only `Correct` or `Wrong`. Review recap uses the
  same centered word/class, speaker, IPA, Definition, Meaning, and Example
  presentation as Practice, without Synonyms or Antonyms.
- Correct advances one FluentA SRS level; wrong resets or keeps the word at
  `Level 0` and schedules tomorrow.
- Review persists each answered word immediately.
- Wrong answers show answer/recap and move to the next word.
- Correct-answer recap follows the global review `recap after answer` setting.

## Review Limits And Settings

- Review has a global daily limit setting with a default of `300 words/day`.
- When due words exceed the daily limit, Review selects the oldest due words
  first and moves the overflow due dates to tomorrow when the session starts.
- Review has a separate global `recap after answer` setting.
- Practice settings and Review settings are separate and live under
  authenticated Settings routes `/settings/practice` and `/settings/review`,
  and both routes save only when the learner clicks their explicit save action.
- Level 5 management lives alongside them at `/settings/level5` inside the
  shared Settings shell. Search is the first control and one Filter dropdown
  exposes All, Active, and Inactive views. Active rows use a final-column
  checkbox, the header checkbox selects or clears all visible active rows, and
  `Remove selected` requires confirmation before the existing transition marks
  those words inactive while preserving review history.

## FluentA SRS

- FluentA SRS uses deterministic levels `0` through `5`.
- `Add to Review` creates `Level 0`, due `+1 day`.
- Correct transitions:
  `0 -> 1 (+2 days)`, `1 -> 2 (+4 days)`, `2 -> 3 (+14 days)`,
  `3 -> 4 (+39 days)`, `4 -> 5 (+60 days)`, and `5 -> 5 (+60 days)`.
- Wrong at any level schedules `+1 day`.
- Wrong at Levels `1-5` increments `lapseCount`; wrong at `Level 0` does not.
- The next due date is always calculated from the actual review date.

## Learning Data Ownership

- All Words decks are removed from the product model.
- Each active vocabulary page is presented directly as exactly one Page Deck;
  no synchronized deck/card projection is stored.
- Review state is stored in a dedicated table linked to `VocabWord`.
- New vocabulary words do not create review state automatically.
- Practice alone does not create review state automatically.
- `Add to Review` creates review state only for words that do not already have
  it.
- Review state stores `level`, `nextReviewDate`, `lapseCount`, and
  `lastReviewedAt`.
- `nextReviewDate` and nullable `lastReviewedAt` are date-only values in the
  domain, JSON contracts (`yyyy-MM-dd`), and PostgreSQL. Review-history
  `reviewedAt` remains a timestamp.
- Review history stores `userId`, `wordId`, `sessionId`, `reviewedAt`, `result`,
  and `timeSpentSeconds`. SRS level and due-date state lives only in
  `word_review_states`.
- Deleting a word, page, or board hard-deletes related review-state records.
- Destructive migration from the old All Words review model is acceptable for
  this redesign.

## Scope Boundaries

- Preserving old All Words review history is out of scope.
- Easy/Good/Hard/Again scoring is out of scope for this workflow.
- Practice does not persist partial progress for abandoned sessions.
- Practice mode overrides per session are out of scope; Practice mode sequence
  is global.
- Review remains board-level and is not page-deck scoped.

## Pronunciation Provider Operations

- Azure Speech is disabled by default. Operators enable it with
  `AzureSpeech__Enabled=true`, then supply `AzureSpeech__Region` and
  `AzureSpeech__SubscriptionKey` through environment configuration. Optional
  `AzureSpeech__TimeoutSeconds` and `AzureSpeech__AccuracyThreshold` default to
  `10` and `70`.
- The subscription key, reference word, raw provider response, and learner
  audio are never returned to the browser or persisted. Automated tests use a
  fake HTTP provider; a credentialed Azure smoke test is an operator step.
- The authenticated endpoint is
  `POST /api/v1/pronunciation/words/{wordId}/assessment` with raw `audio/wav`.
  Success returns only `{ "correct": true|false }`; provider unavailability is
  a generic `503` so the client can retry without decrementing attempts.
