# Page Deck Review Boundary

Date: 2026-06-10

## Status

Accepted

## Context

Page Deck Active Recall needs durable rating evidence, but Page Deck study is
not the spaced-repetition workflow. Reusing a future All Words SM-2 command
would risk mutating scheduling state and would blur the authorization boundary
between the two deck types.

## Decision

Expose an owner-scoped Page Deck session read and a review command that accepts
only active Page Deck cards owned by the authenticated user. Each accepted
rating inserts a `CardReview` that snapshots the card's existing schedule
fields without mutating the card. All Words cards and cards owned by another
user return not found.

## Alternatives Considered

1. Apply SM-2 to every review rating.
2. Accept Page Deck and All Words cards through one command before All Words
   scheduling behavior is implemented.
3. Keep Page Deck ratings entirely client-side.

## Consequences

Positive:

- Page Deck study creates durable review evidence without changing scheduling.
- Ownership and deck-type checks are enforced server-side.
- The future All Words SM-2 story can evolve behind an explicit boundary.

Tradeoffs:

- The review endpoint rejected All Words cards until `US-REVIEW-002`; decision
  `0014-all-words-sm2-transaction` now defines their mutation behavior.
- Session progress and summaries are intentionally not durable.

## Follow-Up

- Completed by `US-REVIEW-002`.
