# 0060 Note Content Limit After Sanitization

Date: 2026-08-17

## Status

Accepted

## Context

Note Workspace sends the rich-text editor's `innerHTML`. Content pasted from a
browser or document can contain enough disposable markup for the raw HTML to
exceed 100,000 characters even when the visible document is only 40,000 to
50,000 characters. The previous application validation rejected that raw HTML
before the Note sanitizer could remove unsupported formatting. PostgreSQL uses
an unrestricted `text` column for Note content, so persistence was not the
failing boundary.

## Decision

Note updates enforce two separate limits:

- raw HTML is limited to 1,000,000 characters before processing;
- sanitized HTML is limited to 100,000 characters before persistence.

The application validates the raw safety limit, sanitizes and validates Note
image references, then validates the persisted-content limit. The Note domain
keeps its 100,000-character guard as the final invariant. Validation failures
continue to use `422 VALIDATION_ERROR` with a field-scoped `content` detail,
and Note Workspace displays that detail while retaining the unsaved draft.

This decision does not change the database schema, Note routes or DTOs, shared
rich-text editor behavior, Journal behavior, or Note image ownership and
cleanup rules.

## Alternatives Considered

1. Keep checking the raw HTML against 100,000 characters. Rejected because
   unsupported clipboard markup would continue to reject otherwise valid Note
   content before sanitization.
2. Remove the raw limit entirely. Rejected because sanitizer work needs a
   bounded input independent of the persisted-content invariant.
3. Strip formatting in the browser before sending. Rejected because it would
   alter supported formatting, duplicate the server security boundary, and
   risk changing the shared Journal editor.
4. Increase the database column size. Rejected because PostgreSQL `text` is
   already unrestricted for this use case and the failure occurs before an
   update command is issued.

## Consequences

Positive:

- verbose pasted HTML can be saved when its sanitized representation fits the
  existing persisted-content limit;
- oversized raw input and oversized persisted content have distinct,
  actionable errors;
- failed saves keep the user's draft available for correction and retry.

Tradeoffs:

- the sanitizer can process a larger input than before, bounded at 1,000,000
  characters;
- the application owns both a transport-safety limit and a persistence
  invariant, which require boundary regression tests.

## Validation

- Note service and content-processor tests cover verbose clipboard HTML, exact
  persisted limits, raw limits, sanitization, and existing image rules.
- Notes component tests cover field-scoped save errors, draft retention, and
  successful retry.
- The focused Notes Playwright flow proves real API persistence and rejection
  behavior against the local stack.
