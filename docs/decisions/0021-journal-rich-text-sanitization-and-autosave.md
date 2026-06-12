# 0021 Journal Rich Text Sanitization And Autosave

Date: 2026-06-11

## Status

Accepted

## Context

Tiptap authors HTML, while Journal content is private user data returned to the
browser. Persisting arbitrary HTML would create a stored-XSS boundary. Autosave
also needs a clear rule for incomplete new entries.

## Decision

Sanitize Journal HTML on the server before persistence, derive and persist
plain text from the sanitized result, and build previews from plain text.
Existing entries auto-save two seconds after the last edit. New entries require
an explicit create action; autosave begins after creation.

## Alternatives Considered

1. Sanitize only in the browser. Rejected because non-browser API clients can
   bypass client sanitization.
2. Store Tiptap JSON instead of HTML. Deferred because SPEC1 explicitly defines
   HTML content and the existing API already exposes a string.
3. Auto-create drafts on first keystroke. Deferred until abandoned-draft and
   incomplete-title behavior are defined.

## Consequences

Positive:

- Returned Journal HTML is safe to render.
- Plain text is available for previews and the later search story.
- Autosave never creates accidental untitled records.

Tradeoffs:

- Existing plain content remains valid but is converted to rich HTML when next
  edited.
- Every content write performs sanitization and text extraction.

## Follow-Up

- Add full-text search over `plain_text_content`.
- Define draft lifecycle if auto-created drafts are desired.

