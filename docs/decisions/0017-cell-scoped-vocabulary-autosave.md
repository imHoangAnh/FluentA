# Cell-Scoped Vocabulary Autosave

Date: 2026-06-10

## Status

Accepted

## Context

Spreadsheet autosave can issue overlapping requests. Reusing the whole-word
update contract would allow a stale row snapshot or response to overwrite an
unrelated successful cell edit.

## Decision

Expose an owner-scoped cell update command keyed by stable fixed or custom
column key. Fixed cells validate against the latest durable word and update
only the named vocabulary and flashcard columns in one transaction. Custom
cells upsert only one normalized custom-value row and do not change flashcard
content.

The client maintains independent cell drafts, serializes same-cell saves, lets
unrelated cells save in parallel, and merges only the confirmed cell from each
response into TanStack Query cache. Failed drafts remain visible with inline
Retry. A visible-column descriptor list owns rendering and focus order.

## Alternatives Considered

1. Autosave full-word payloads.
2. Serialize every table save globally.
3. Invalidate and reload the whole page after each save.
4. Revert drafts automatically on failure.

## Consequences

Positive:

- Unrelated concurrent cell saves cannot overwrite one another in persistence
  or the client cache.
- Fixed-cell flashcard synchronization remains transactional and
  schedule-preserving.
- Keyboard traversal follows the same dynamic visible-column model as
  rendering.

Tradeoffs:

- Fixed fields require an explicit persistence switch for their matching word
  and card columns.
- Cell drafts and pending/error state add frontend lifecycle complexity.
