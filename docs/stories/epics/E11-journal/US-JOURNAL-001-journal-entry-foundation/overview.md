# Overview

## Current Behavior

FluentA has no Journal bounded context, Journal API, persistence, or protected
Journal page.

## Target Behavior

Authenticated learners can create, list, open, edit, and soft-delete their own
plain-text Journal entries at `/journal`. Entries support Unicode content,
optional learning dates, and newest-first list previews.

## Affected Users

- Authenticated FluentA learners.

## Affected Product Docs

- `docs/product/journal.md`

## Non-Goals

- Tiptap rich-text formatting.
- Debounced auto-save.
- Full-text search.
- Calendar indicators or date-based open-or-create.
