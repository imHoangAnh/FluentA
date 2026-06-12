# Design

## Domain Model

`JournalEntry.Content` becomes sanitized HTML. `PlainTextContent` stores text
derived from that HTML, and `Preview` remains a bounded derivative of the
plain-text value.

## Application Flow

`IJournalContentProcessor` sanitizes incoming HTML and derives plain text before
the Journal service creates or updates an entry. Existing entries auto-save
from the browser after a two-second quiet period. New entries require an
explicit create action before autosave begins.

## Interface Contract

The existing Journal endpoints and response shapes remain stable. The semantic
meaning of `content` changes from plain text to sanitized HTML.

## Data Model

Add required `plain_text_content` text storage and backfill it from existing
plain content. No search index is added in this story.

## UI / Platform Impact

Replace the Journal textarea with Tiptap and an accessible formatting toolbar.
Show `Saving...`, `Saved`, and `Save failed` states. Keep the existing explicit
button for creating new entries and manual retry.

## Observability

Existing authenticated request logging covers autosave PATCH requests.

## Alternatives Considered

1. Sanitize only in the browser. Rejected because API clients could bypass it.
2. Auto-create drafts while typing. Deferred because incomplete-title and
   abandoned-draft behavior need a separate product decision.

