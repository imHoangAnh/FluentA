# 0022 Journal Multilingual Search Boundary

Date: 2026-06-12

## Status

Accepted

## Context

Journal content may use any language. PostgreSQL language-configured full-text
search can stem supported languages well, but one fixed configuration is a poor
fit for mixed-script private notes and does not provide predictable substring
matching.

## Decision

Search only active, owner-scoped `plain_text_content` using case-insensitive
substring matching. Enable `pg_trgm` and add a partial GIN trigram index for
active rows. Return contextual plain-text snippets with explicit highlight
ranges; never return server-generated highlight HTML.

## Alternatives Considered

1. Use an English or simple `tsvector`. Deferred because multilingual matching
   behavior would be inconsistent and substring queries would be lost.
2. Search full HTML content. Rejected because formatting markup is not learner
   content.
3. Return highlighted HTML. Rejected because it creates an unnecessary trusted
   markup boundary.

## Consequences

- Unicode substring search behaves consistently across Journal content.
- Search remains owner scoped and excludes deleted rows.
- Result snippets can be rendered safely with native `mark` elements.
- Ranking and linguistic stemming remain deferred.

## Follow-Up

- Revisit ranking or language-aware search if corpus size and learner behavior
  justify it.

