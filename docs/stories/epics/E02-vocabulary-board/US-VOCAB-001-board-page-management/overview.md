# Overview

## Current Behavior

After login, FluentA shows a protected placeholder workspace. There is no
Vocabulary Board API, persistence model, page management UI, or Flashcard deck
record creation.

## Target Behavior

Logged-in users can create and manage their own vocabulary boards and pages.
Board creation creates an All Words deck record. Page creation creates a Page
deck record. The protected workspace becomes a usable board/page management
surface.

## Affected Users

- Learners organizing vocabulary by exam, topic, unit, or chapter.

## Affected Product Docs

- `docs/product/vocabulary-board.md`

## Non-Goals

- Inline vocabulary word entry.
- Flashcard cards and spaced-repetition review.
- Column customization.
- Production deployment or collaboration behavior.
