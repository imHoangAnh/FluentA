# Global Daily Review Planning

Date: 2026-06-10

## Status

Accepted

## Context

All Words Spaced mode needs configurable daily limits that apply globally
across boards, respect the learner-local day, count repeated reviews once, and
remain consistent with reviews completed through Normal and Shuffle.

## Decision

Store one optional `review_settings` row per user. Missing rows use defaults of
20 new cards and 200 review cards. Validate configured limits from 0 through
1000.

Build Spaced queues directly from PostgreSQL. Derive learner-local UTC day
bounds from a validated browser timezone. Count distinct All Words card IDs
reviewed during that day across all decks. A card consumes a new slot when its
first-ever review occurs during the day; cards with earlier review history
consume review slots. Exclude already-consumed cards from later Spaced queues
that day.

Return cards from the selected owned All Words deck in this order: overdue,
due today, then new. Normal and Shuffle continue to include the full deck, but
their reviews still consume the global daily allowance.

## Alternatives Considered

1. Store per-board limits.
2. Let the browser calculate day bounds and allowances.
3. Build Redis queues from a midnight background job.
4. Count review rows instead of distinct cards.

## Consequences

Positive:

- Daily planning stays correct across boards and repeated reviews.
- Spaced queues reflect current durable card state without cache staleness.
- No durable session aggregate is required.

Tradeoffs:

- The due query performs several indexed database reads.
- New-versus-review consumption is derived from review history because
  `CardReview` does not snapshot the prior card state.

## Follow-Up

- Add dashboard statistics using the same review-history and local-day rules.
