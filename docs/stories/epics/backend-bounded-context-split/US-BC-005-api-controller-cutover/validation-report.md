# Validation Report

## Outcome

`US-BC-005` is implemented and verified.

The API layer now reflects the bounded-context ownership approved in Feature
20. Flashcard routes stay in `FlashcardsController`, Practice routes live in
`PracticeController`, Review routes live in `ReviewController`, and
`SettingsController` keeps the aggregate `GET /api/v1/settings` surface.

## Reality Gate Results

| Gate | Result | Notes |
| --- | --- | --- |
| Mode fit | PASS | This is a high-risk public API and route-removal story. |
| Repo fit | PASS | Controllers, services, and route scans match the target split. |
| Assumptions | PASS WITH CONSTRAINTS | Frontend and E2E still reference removed legacy routes, and that rewrite remains deferred to `US-BC-006`. |
| Smaller path | PASS | Controller cutover stayed scoped to the API layer after service/repository/schema ownership had already been split. |
| Proof surface | PASS | Controller source, backend build/tests, and route scans were enough to verify the cutover. |

## Key Evidence

| Check | Result | Evidence |
| --- | --- | --- |
| Flashcard controller is context-owned | PASS | `src/backend/FluentA.API/Controllers/FlashcardsController.cs` now injects only `IFlashcardService` and exposes only `GET /api/v1/flashcards/decks` plus `GET /api/v1/flashcards/decks/{deckId}/cards`. |
| Practice controller owns practice routes | PASS | `src/backend/FluentA.API/Controllers/PracticeController.cs` now exposes `POST /api/v1/practice/sessions`, `POST /api/v1/practice/add-to-review`, `GET /api/v1/practice/settings`, and `PUT /api/v1/practice/settings`. |
| Review controller owns review routes | PASS | `src/backend/FluentA.API/Controllers/ReviewController.cs` now exposes `/api/v1/review/sessions`, `/api/v1/review/sessions/{sessionId}/summary`, `/api/v1/review/dashboard`, `/api/v1/review/dashboard/{boardId}`, `/api/v1/review/settings`, and `POST /api/v1/review`. |
| Legacy mixed flashcard routes are removed from controllers | PASS | Static controller scan no longer finds `flashcards/practice-sessions`, `flashcards/sessions`, `flashcards/dashboard`, `flashcards/review`, `practice-settings`, or `flashcards/settings` endpoints in `src/backend/FluentA.API/Controllers`. |
| Settings aggregate survives the split | PASS | `src/backend/FluentA.API/Controllers/SettingsController.cs` still composes `IAuthService`, `IPracticeService`, and `IReviewService` for `GET /api/v1/settings` while dropping duplicated owned endpoints. |
| Backend proof still passes | PASS | `dotnet test src/backend/FluentA.Application.UnitTests/FluentA.Application.UnitTests.csproj`, `dotnet test src/backend/FluentA.Domain.UnitTests/FluentA.Domain.UnitTests.csproj`, and `dotnet build src/backend/FluentA.API/FluentA.API.csproj --no-restore` all passed; the build kept the existing `Microsoft.OpenApi` `NU1903` warning. |

## Commands Run

```text
Get-Content src/backend/FluentA.API/Controllers/FlashcardsController.cs
Get-Content src/backend/FluentA.API/Controllers/PracticeController.cs
Get-Content src/backend/FluentA.API/Controllers/ReviewController.cs
Get-Content src/backend/FluentA.API/Controllers/SettingsController.cs
rg -n "\\[Http(Get|Post|Put|Delete).*\\]|Route\\(|class .*Controller" src/backend/FluentA.API/Controllers -S
rg -n "/api/v1/flashcards/practice-sessions|/api/v1/flashcards/sessions|/api/v1/flashcards/review|/api/v1/flashcards/dashboard|practice-settings|/api/v1/flashcards/settings" src/backend/FluentA.API/Controllers -S
dotnet test src/backend/FluentA.Application.UnitTests/FluentA.Application.UnitTests.csproj
dotnet test src/backend/FluentA.Domain.UnitTests/FluentA.Domain.UnitTests.csproj
dotnet build src/backend/FluentA.API/FluentA.API.csproj --no-restore
git diff --check
```

## Constraints To Preserve During Execution

- Do not rewrite frontend API clients in this story.
- Do not rewrite Playwright/Vitest route references in this story.
- Do not reintroduce a mixed learning controller or service facade.
- Keep `GET /api/v1/settings` available for aggregate profile/settings composition.

## Closeout Gate

`US-BC-005` is complete on the backend side.

The next dependent story is `US-BC-006`, which must update frontend API
clients, mocks, and browser proof to consume the new `/api/v1/practice/*` and
`/api/v1/review/*` ownership directly.
