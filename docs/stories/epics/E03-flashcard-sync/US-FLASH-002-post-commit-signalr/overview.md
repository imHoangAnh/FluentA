# Overview

## Current Behavior

Vocabulary changes synchronize durable cards, but connected clients receive no
real-time notification.

## Target Behavior

Authenticated clients receive post-commit vocabulary/card synchronization
events through `/hubs/sync`.

## Affected Users

- Logged-in learners with FluentA open in a browser.

## Affected Product Docs

- `docs/product/flashcards.md`

## Non-Goals

- Flashcard viewer.
- Redis backplane.
- Offline retry of notifications.
