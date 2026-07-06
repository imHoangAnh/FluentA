# Validation

## Proof Strategy

Feature 21 is complete only when the repo proves all locked risks in the SPEC:
migration safety, fixed word CRUD, IPA slash preservation, removed
custom-column remnants, board-wide preference behavior, horizontal overflow,
and Review ownership integrity.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | Domain/application vocabulary coverage from US-VOCAB-006 |
| Integration | migration script, schema/runtime checks, owner-scoped preference persistence |
| E2E | focused vocabulary browser proof and any cross-surface fallout checks |
| Platform | API build, frontend lint/test/build, `git diff --check` |
| Performance | none |
| Logs/Audit | validation and matrix evidence only |

## Fixtures

- Authenticated user with at least one board and two pages.
- Existing word containing slash-delimited pronunciation text.
- Legacy data rows for migration review.

## Commands

```text
dotnet test src/backend/FluentA.Domain.UnitTests/FluentA.Domain.UnitTests.csproj --filter Vocabulary
dotnet test src/backend/FluentA.Application.UnitTests/FluentA.Application.UnitTests.csproj --filter Vocabulary
dotnet build src/backend/FluentA.API/FluentA.API.csproj --no-restore
dotnet tool run dotnet-ef migrations script --project src/backend/FluentA.Infrastructure --startup-project src/backend/FluentA.API
npm --prefix src/frontend run lint
npm --prefix src/frontend run test:run -- VocabTable
npm --prefix src/frontend run build
npm --prefix src/frontend run test:e2e -- vocabulary.spec.js
git diff --check
```

## Acceptance Evidence

Add results after verification.
