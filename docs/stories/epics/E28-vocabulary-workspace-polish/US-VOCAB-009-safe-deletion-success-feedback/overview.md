# US-VOCAB-009 Overview

## Status

planned

## Lane

normal

## Product Contract

Expose the existing Vocabulary Board/Page/Word delete contract through
accessible, target-specific confirmation and deterministic post-delete state,
and acknowledge only eligible manual Vocabulary create/delete successes with
bottom-right toasts.

## Relevant Product Docs

- `docs/product/vocabulary-board.md`
- `docs/product/flashcards.md`
- `docs/product/learning-workflows.md`
- `docs/stories/epics/E28-vocabulary-workspace-polish/context.md`

## Acceptance Criteria

- Right-clicking a Board selects/highlights it and opens a context menu whose
  destructive item is `Delete Board`.
- Right-clicking a Page selects/highlights it and opens `Delete Page`.
- The selected delete item opens a modal naming the exact target, explaining
  related-data deletion, and offering `Cancel` and destructive `Delete`.
- Word delete uses the same modal pattern and no longer calls `window.confirm`.
- Cancel and Escape do not call the delete endpoint; focus returns safely.
- Confirm cannot produce duplicate requests while deletion is pending.
- After active Page deletion, the newest remaining Page is selected; after
  active Board deletion, the newest remaining Board is selected; a true empty
  state appears only when no replacement exists.
- Create Board/Page/Word and Delete Board/Page/Word successes show specific
  bottom-right toasts for about three seconds, with explicit close and newest
  toast at the bottom.
- Cell autosave and preference persistence produce no success toast.
- Existing API, ownership, deletion, flashcard cleanup, and review cleanup
  behavior remains unchanged.

## Non-Goals

- Table-column deletion, rename UI, manual Save, Update toast triggers, Search,
  Filter, or notifications outside Vocabulary.
- Backend, API, schema, cascade, SignalR, or ownership changes.

## Validation Summary

- Component tests for target capture, modal copy, cancel/confirm/pending state,
  selection fallback, exact toast triggers, and autosave exclusion.
- Targeted Vocabulary backend regression tests for existing cleanup.
- API-backed Chromium proof for Board/Page/Word deletion, replacement
  selection, final empty states, and toast placement/dismissal.
- Frontend lint/test/build and dependency/bundle checks.
