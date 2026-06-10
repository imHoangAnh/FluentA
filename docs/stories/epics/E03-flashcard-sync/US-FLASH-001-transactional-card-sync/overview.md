# Overview

## Current Behavior

Vocabulary words are durable, and board/page deck records exist, but words do
not create or synchronize flashcard cards.

## Target Behavior

Vocabulary word create, update, and delete commands transactionally synchronize
cards in the Page and All Words decks. Deletion removes synchronized cards and
all review history.

## Affected Users

- Learners maintaining vocabulary that feeds the Flashcards review system.

## Affected Product Docs

- `docs/product/vocabulary-board.md`
- `SPEC.md`

## Non-Goals

- SignalR notification.
- Flashcard viewer.
- Review sessions and SM-2 calculations.
