# Overview

## Current Behavior

FluentA currently has no Note bounded context, no `/api/v1/notes/*` API
surface, no Note board/page tables, and no protected `/notes` workspace route.
The closest shipped patterns are Vocabulary board/page ownership and Journal
sanitized rich-text persistence, but those contracts serve different user
surfaces and do not yet provide durable Note resources.

## Target Behavior

FluentA introduces owner-scoped Note boards and Note pages as durable backend
records with CRUD API routes, soft-delete lifecycle, and non-disclosing `404`
behavior for missing, deleted, or foreign-user resources. Deleting a Note board
soft-deletes its pages together in the first release, matching locked decision
`D2`.

This story establishes the backend Note contract only. The shipped `/notes`
frontend workspace, Journal-editor reuse, blur/page-switch save flow, and
embedded image uploads are deferred to later Note stories.

## Affected Users

- Authenticated learners who will later create and organize Note boards/pages.
- Maintainers and agents implementing later Note UI, editor, and asset stories.

## Affected Product Docs

- `docs/product/notes.md`
- `docs/ARCHITECTURE.md`
- `SPEC.md` Section 25

## Non-Goals

- Protected `/notes` frontend routing and workspace shell.
- Journal rich-text editor reuse or autosave timing changes.
- Paste/drop image upload and removed-image cleanup.
- Search, tags, sharing, templates, or cross-feature links.
