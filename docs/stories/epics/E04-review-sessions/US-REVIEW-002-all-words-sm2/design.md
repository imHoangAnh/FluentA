# Design

## Domain Model

Add a pure domain `Sm2Scheduler` that receives current scheduling values and a
rating, then returns the next interval, ease factor, repetitions, and state
using the locked SM-2 algorithm:

- Again or Hard: interval `1`, repetitions `0`.
- Good or Easy with zero repetitions: interval `1`, repetitions `1`.
- Good or Easy with one repetition: interval `6`, repetitions `2`.
- Later Good or Easy: interval is the existing interval multiplied by the
  existing ease factor and rounded to the nearest whole day with midpoint
  values away from zero, then repetitions increments.
- Ease factor always applies the SPEC formula and clamps at `1.3`.
- State derives from the resulting interval: `< 7` Learning, `7-20` Review,
  `>= 21` Mature.
- Next review is the first valid instant of the learner-local calendar date
  produced by adding the resulting interval to the learner-local review date.

Use the algorithm block in SPEC section 6.4.3 as authoritative. The earlier
rating-impact table's Easy multiplier is not part of this SM-2 rule.

## Application Flow

The generic review-session read accepts owned active Page Deck and All Words
decks. The existing ephemeral browser session supports Normal and Shuffle for
both types.

The generic review command validates IDs, rating, elapsed time, and the required
browser timezone before calling the repository. The repository owner-scopes the
card through its active deck and board:

- Page Deck: insert a review snapshot without changing scheduling.
- All Words: apply SM-2, update the card, and insert the resulting review.

One `SaveChangesAsync` commits the All Words card mutation and `CardReview`.
After a successful All Words commit, the application service publishes
`FlashcardDeckUpdated` for that deck.

## Interface Contract

- `GET /api/v1/flashcards/decks/{deckId}/cards`
  - returns an owned active Page Deck or All Words deck, including deck type
    and board language
- `POST /api/v1/flashcards/review`
  - accepts `sessionId`, `cardId`, rating `0-3`, `timeSpentSeconds`, and
    `timeZoneId`
  - returns resulting interval, ease factor, repetitions, next review date,
    state, board ID, deck ID, and deck type
- protected route `/flashcards/decks/{deckId}/review`

The timezone is required and validated for every review request so unknown
boundary input never enters persistence code. Page Deck scheduling ignores the
validated zone; All Words uses it to derive the next review timestamp. Invalid
or unsupported timezone IDs return validation errors. Conversion must handle
DST offset changes and rare invalid local-midnight transitions without failing
an otherwise valid rating.

## Data Model

No migration. Existing card scheduling columns and append-only `card_reviews`
are sufficient.

## UI / Platform Impact

All Words deck cards gain a study action. The shared review route identifies
the deck type, offers Normal and Shuffle only for this story, explains that All
Words ratings update scheduling, and otherwise reuses reveal, TTS, keyboard,
progress, abandonment, and immediate-summary behavior.

## Observability

Existing request logs record the review request result without logging card
content or tokens. SignalR invalidation occurs only after durable commit.

## Alternatives Considered

1. Implement Spaced mode in the same story. Rejected because global limits,
   distinct-card accounting, and due queues belong to `US-REVIEW-003`.
2. Use UTC date for All Words scheduling. Rejected because locked decision D12
   requires learner-local day semantics.
3. Let the client calculate next review dates. Rejected because scheduling and
   review persistence must remain one server-owned transaction.
