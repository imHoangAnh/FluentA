# Overview

## Current Behavior

Feature 21 needs cross-cutting proof because it changes schema, API shape,
workspace behavior, and flashcard sync read content.

## Target Behavior

Release proof confirms migration safety, fixed word CRUD, spreadsheet autosave,
board preference persistence, removed custom-column paths, horizontal overflow,
and preserved Flashcard/Review ownership boundaries.

## Affected Users

- Authenticated learners using vocabulary, flashcard, practice, and review
  surfaces touched by synchronized word content.

## Affected Product Docs

- `docs/product/vocabulary-board.md`
- `docs/product/learning-workflows.md`

## Non-Goals

- New behavior outside Feature 21.
