# Exec Plan

## Goal

Deliver owner-scoped Unicode Journal content search with safe highlighted
previews.

## Scope

In scope:

- Search API and validation.
- Owner/deleted filtering.
- Trigram search index migration.
- Contextual snippets and explicit highlight ranges.
- Debounced Journal search UI.
- Focused backend and browser proof.

Out of scope:

- Search ranking, pagination, title search, and calendar behavior.

## Risk Classification

Risk flags:

- Authorization.
- Data model.
- Public contracts.
- Existing behavior.

Hard gates:

- Authorization.
- Database migration.

## Work Phases

1. Record search contract and durable decision.
2. Implement owner-scoped repository and application search.
3. Add PostgreSQL trigram migration.
4. Add debounced highlighted search UI.
5. Verify backend, migration, frontend, and browser flow.
6. Update Harness evidence and trace.

## Stop Conditions

Pause for human confirmation if:

- Search requires exposing full private content in list responses.
- The index requires a platform extension unavailable in local PostgreSQL.
- Validation requirements need to be weakened.

