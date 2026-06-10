# Normalized Vocabulary Custom Columns

Date: 2026-06-10

## Status

Accepted

## Context

Vocabulary boards need user-defined text and number columns that work on every
page, private visibility preferences, typed validation, and permanent deletion
of a definition and all associated values.

## Decision

Store custom-column definitions as board-owned relational rows, custom values
as word/column-owned typed rows, and hidden-column preferences as user/board
rows keyed by stable built-in or custom-column keys.

Custom-column deletion removes the definition, all typed values, and matching
preferences in one database commit. Custom values remain vocabulary-only and
are not copied into synchronized flashcard cards.

Keep the current whole-word explicit-save contract for this story. A later
story will add cell-scoped commands and spreadsheet autosave.

## Alternatives Considered

1. Store custom values as JSON on each vocabulary word.
2. Create dynamic database columns from user actions.
3. Include custom values in flashcard copies.
4. Combine persistence changes with spreadsheet autosave.

## Consequences

Positive:

- Typed values and destructive deletion have explicit relational integrity.
- Board ownership and private preferences remain enforceable.
- Flashcard review content stays stable.

Tradeoffs:

- Word reads require a second custom-value query.
- New custom value types require schema and contract changes.
- Whole-row saves remain until the autosave story.
