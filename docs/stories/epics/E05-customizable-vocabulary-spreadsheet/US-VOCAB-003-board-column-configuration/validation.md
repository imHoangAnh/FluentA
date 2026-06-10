# Validation

## Proof Strategy

The story is complete when typed board-wide custom columns work across pages,
visibility is private per user and board, permanent deletion removes all
associated values, and existing vocabulary/flashcard behavior remains green.

## Test Plan

| Layer | Cases |
| --- | --- |
| Domain/Application | Definition/name/type rules, typed values, visibility, ownership, deletion |
| Integration | Migration, two-user/two-board isolation, cross-page values, atomic deletion |
| E2E | Create/toggle/edit/delete columns and regress existing word CRUD |
| Platform | Backend build, frontend lint/tests/build |
| Regression | Fixed word updates still synchronize flashcards; custom-only values do not |

## Acceptance Evidence

- Backend domain/application suites passed 40 tests.
- `AddVocabularyColumnConfiguration` migration applied to PostgreSQL.
- Direct API/PostgreSQL proof created two pages, a typed number value, and
  private hidden keys; a foreign user received `404`.
- Before permanent deletion, proof found one custom value, two synchronized
  flashcards, and one matching preference. After deletion, the definition,
  value, and preference counts were zero while both flashcards remained.
- Frontend lint, component tests, production build, existing vocabulary smoke,
  and focused column-configuration Playwright flow passed.
- Review added explicit `numeric(18,4)` range/scale validation so oversized
  values return `422 VALIDATION_ERROR` instead of reaching a database error.
