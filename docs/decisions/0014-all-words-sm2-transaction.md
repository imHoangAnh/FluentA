# All Words SM-2 Transaction

Date: 2026-06-10

## Status

Accepted

## Context

All Words ratings own long-term scheduling changes. The card update, review
history, learner-local next-review date, and client invalidation must agree
even when the same shared review route also supports schedule-preserving Page
Deck ratings.

## Decision

Use one owner-scoped review command for Page Deck and All Words cards. Page
Deck ratings retain their schedule-preserving behavior. All Words ratings apply
the deterministic SPEC section 6.4.3 SM-2 rule, update the card, and insert the
matching `CardReview` in one database commit. Every review request supplies an
IANA timezone ID that is validated at the application boundary; All Words uses
it to derive the learner-local review date. SignalR deck invalidation is
published only after the commit succeeds.

Multiplied intervals use nearest-whole-day rounding with midpoint values away
from zero. The stored next-review timestamp is the first valid instant of the
target learner-local calendar date.

Every All Words mode updates scheduling. This follows locked decision D8 and
overrides the older SPEC sentence that described Normal/Shuffle as browsing
without schedule impact.

## Alternatives Considered

1. Separate review endpoints by deck type.
2. Calculate schedules and dates in the browser.
3. Publish invalidation before the database commit.
4. Defer timezone handling until Spaced mode.

## Consequences

Positive:

- Card state and review history cannot disagree after a successful command.
- Page Deck and All Words semantics remain explicit behind one client contract.
- Scheduling dates respect the learner-local day before due queues arrive.

Tradeoffs:

- The review request gains a timezone field for All Words ratings.
- Spaced mode and daily allowance accounting still require separate work.

## Follow-Up

- Add settings, global daily allowances, and Spaced due queues in
  `US-REVIEW-003`.
