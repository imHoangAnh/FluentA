# Overview

## Current Behavior

Vocabulary pages still expose the E05 customizable spreadsheet model. The
backend stores `meaningEn`, `thesaurus`, `collocation`, and custom values,
while the frontend can create board-wide text/number custom columns and hide
optional/custom columns with user-scoped visibility preferences.

## Target Behavior

Vocabulary pages move to the fixed Feature 21 word shape:
`word`, `meaningVn`, `ipaPronunciation`, `definition`, `class`, `example`,
`note`, `synonyms`, and `antonyms`. The backend removes custom-column
definitions, custom values, and visibility APIs, then adds one per-user,
per-board preference row for hidden nullable columns, column order, and column
widths reused across every page in the board.

## Affected Users

- Authenticated learners managing vocabulary boards and pages.

## Affected Product Docs

- `docs/product/vocabulary-board.md`
- `docs/product/learning-workflows.md`

## Non-Goals

- Frontend interaction polish beyond the backend contract needed for Feature 21.
- Review algorithm or review-history changes.
- Import/export redesign unless required by compilation or proof.
