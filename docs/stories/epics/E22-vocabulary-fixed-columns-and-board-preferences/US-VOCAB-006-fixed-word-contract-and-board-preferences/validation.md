# Validation

## Proof Strategy

This story is done when the backend alone proves the fixed Feature 21 contract:
custom-column APIs are gone, fixed word CRUD and cell updates work, IPA slash
content survives round-trips, board preferences are owner-scoped and board-wide,
and Flashcard/Review ownership boundaries remain intact.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | `VocabWord` required/nullable field rules, IPA slash preservation, preference validation, fixed word DTO/service validation |
| Integration | EF migration/script generation, preference upsert/read owner scope, fixed-cell persistence, flashcard sync preservation, removed endpoint/static scan |
| E2E | none in this story |
| Platform | API build, migration script generation |
| Performance | none |
| Logs/Audit | existing validation and 404 envelopes only |

## Fixtures

- One authenticated user with one board and two pages in the same board.
- One vocabulary word with slash-delimited pronunciation text.
- Existing rows using `meaning_en`, `thesaurus`, and `collocation` for
  migration review.

## Commands

```text
dotnet test src/backend/FluentA.Domain.UnitTests/FluentA.Domain.UnitTests.csproj --filter Vocabulary
dotnet test src/backend/FluentA.Application.UnitTests/FluentA.Application.UnitTests.csproj --filter Vocabulary
dotnet build src/backend/FluentA.API/FluentA.API.csproj --no-restore
dotnet tool run dotnet-ef migrations script --project src/backend/FluentA.Infrastructure --startup-project src/backend/FluentA.API
```

## Acceptance Evidence

Add results after verification.
