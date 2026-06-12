# Overview

## Current Behavior

Journal entries are authored in a plain textarea and saved only through an
explicit create or update action.

## Target Behavior

Authenticated learners author sanitized rich-text Journal entries with a
Tiptap toolbar. Existing entries auto-save two seconds after the learner stops
editing and show saving, saved, or failed status.

## Affected Users

- Authenticated FluentA learners.

## Affected Product Docs

- `docs/product/journal.md`

## Non-Goals

- Auto-creating untitled draft entries.
- Full-text search and highlighted results.
- Calendar indicators or date-based open-or-create behavior.

