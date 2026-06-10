# Overview

## Current Behavior

Learners can study Page Decks and record schedule-preserving ratings. All Words
decks remain read-only and the review endpoint rejects their cards.

## Target Behavior

Learners can start Normal or Shuffle sessions from an All Words deck. Every
rating applies deterministic SM-2 scheduling and inserts the matching review
record in one owned transaction, then publishes deck invalidation after commit.

## Affected Users

- Authenticated learners studying an All Words deck.

## Affected Product Docs

- `docs/product/flashcards.md`

## Non-Goals

- Spaced due queues, daily limits, account settings, dashboard statistics, or
  durable session summaries.
