# Design

## Domain Model

No aggregate change. Search reads the existing derived
`JournalEntry.PlainTextContent`.

## Application Flow

The service validates and trims the query, asks the owner-scoped repository for
at most 50 active content matches, then builds bounded contextual snippets and
case-insensitive highlight ranges without returning full plain text.

## Interface Contract

- `GET /api/v1/journals/search?q=keyword`
- Blank or over-100-character queries return `422 VALIDATION_ERROR`.
- Results contain the normal Journal summary fields plus `highlights`, an array
  of zero-based `{ start, length }` ranges within `preview`.

## Data Model

Enable PostgreSQL `pg_trgm` and add a partial GIN trigram index on
`plain_text_content` for active Journal entries. The query remains owner scoped.

## UI / Platform Impact

Add a debounced search input above the Journal list. Search results replace the
normal list while a trimmed query is present. Matched ranges render with native
`mark` elements, and clearing the input restores the normal list.

## Observability

Existing authenticated request logging covers Journal search requests.

## Alternatives Considered

1. PostgreSQL language-configured `tsvector`. Deferred because FluentA content
   is multilingual and substring matching is more predictable across scripts.
2. Return highlighted HTML from PostgreSQL. Rejected because highlight markup
   should not become a trusted HTML boundary.

