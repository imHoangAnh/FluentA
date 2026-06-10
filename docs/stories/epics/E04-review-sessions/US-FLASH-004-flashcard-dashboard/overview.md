# Overview

## Current Behavior

The flashcard page lists synchronized decks and cards, but SPEC.md dashboard statistics are absent.

## Target Behavior

Authenticated learners see a dashboard on `/flashcards` with streak, retention rate, due/new counts, and a 7-day forecast built from their existing flashcard cards and review history.

## Affected Users

- Authenticated learners reviewing cards.

## Affected Product Docs

- `docs/product/flashcards.md`

## Non-Goals

- Persist dashboard summaries.
- Add a charting library.
- Add cross-user/admin analytics.
