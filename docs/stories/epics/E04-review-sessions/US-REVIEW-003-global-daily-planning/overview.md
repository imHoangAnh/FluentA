# Overview

## Current Behavior

All Words Normal and Shuffle sessions update SM-2 scheduling, but learners
cannot configure daily limits or start a prioritized Spaced session.

## Target Behavior

Learners configure global daily new/review limits and start All Words Spaced
sessions that return overdue, due-today, then new cards within their remaining
learner-local-day allowances.

## Affected Users

- Authenticated learners using All Words review.

## Affected Product Docs

- `docs/product/flashcards.md`

## Non-Goals

- Dashboard statistics and charts.
- Durable session history.
- Per-board limits.
