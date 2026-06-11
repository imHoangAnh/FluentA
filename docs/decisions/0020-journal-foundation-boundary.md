# 0020 Journal Foundation Boundary

Date: 2026-06-11

## Status

Accepted

## Context

SPEC1 defines Journal Pages with Tiptap rich text, auto-save, full-text search,
and a learning-date calendar. Delivering those together would combine a new
owner-scoped data model, editor dependency, persistence timing, search
behavior, and calendar workflow in one high-risk change.

## Decision

Implement US-JOURNAL-001 as an owner-scoped Journal Entry Foundation. Persist
required title, optional plain Unicode content, derived preview text, optional
learning date, timestamps, and soft deletion. Expose authenticated CRUD and a
newest-first list, with missing/deleted/foreign entries returning the same
`404 JOURNAL_NOT_FOUND` result.

Use a plain textarea in the first protected `/journal` page. Defer Tiptap HTML,
auto-save, full-text search, and calendar behavior to later Journal stories.

## Alternatives Considered

1. Implement the entire Journal feature in one story. Rejected because editor,
   search, calendar, and auto-save each add distinct contracts and proof needs.
2. Persist HTML immediately while using a textarea UI. Rejected because the
   first UI would not safely author or sanitize the claimed rich-text contract.
3. Hard-delete entries. Rejected because current private productivity domains
   consistently preserve soft-delete behavior.

## Consequences

- Learners receive a usable Unicode journal CRUD surface immediately.
- The first migration remains stable for later editor and search enhancements.
- Content is plain text until the rich-text story explicitly changes the
  content contract.

## Follow-Up

- Add Tiptap formatting and debounced auto-save.
- Add search and learning-date calendar behavior.
