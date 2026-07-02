# Validation

## Proof Strategy

Use existing backend Flashcard service tests and frontend route tests to prove
behavior did not change, then rely on build/EF proof for translation and schema
validity.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | Flashcard service/dashboard tests still pass. |
| Integration | EF-translated dashboard queries compile and migration applies. |
| E2E | Focused Review/Practice E2E remains optional for this non-visible query rewrite. |
| Platform | API build succeeds. |
| Performance | Dashboard no longer materializes all active cards/states/histories for aggregate counts. |
| Logs/Audit | Harness trace records query rewrite and validation. |

## Fixtures

- Existing FlashcardService test fakes.
- Local PostgreSQL schema for EF translation/build proof.

## Commands

```text
dotnet test src/backend/FluentA.Application.UnitTests/FluentA.Application.UnitTests.csproj --filter FlashcardServiceTests
dotnet build src/backend/FluentA.API/FluentA.API.csproj --no-restore
```

## Acceptance Evidence

- `dotnet test src/backend/FluentA.Application.UnitTests/FluentA.Application.UnitTests.csproj --filter FlashcardServiceTests` passed: 16 tests.
- `dotnet test src/backend/FluentA.slnx --no-restore` passed: 138 backend
  tests total.
- `npm --prefix src/frontend run test:run -- App.test.tsx` passed: 10 tests.
- `dotnet build src/backend/FluentA.API/FluentA.API.csproj --no-restore`
  passed with 0 warnings and 0 errors.
- `npm --prefix src/frontend run lint` passed.
- `npm --prefix src/frontend run build` passed with existing
  SignalR/Rolldown pure annotation warnings and chunk-size warning.
