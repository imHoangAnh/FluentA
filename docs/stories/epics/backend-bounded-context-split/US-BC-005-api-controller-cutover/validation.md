# Validation

## Proof Strategy

Prove the story is ready by checking that route ownership is already fully
mapped, controllers still mix contexts today, backend compile/tests are
available, and frontend/E2E dependencies on old routes are visible but can
remain deferred to `US-BC-006`.

## Reality Gate

| Gate | Result | Evidence |
| --- | --- | --- |
| Mode fit | PASS | This is a high-risk public API contract cutover. |
| Repo fit | PASS | Current controllers and services are present, searchable, and already split enough in the application layer. |
| Assumptions | PASS WITH CONSTRAINTS | Frontend and E2E suites still reference old endpoints, but those rewrites are explicitly assigned to `US-BC-006`. |
| Smaller path | PASS | Controller split after repo/schema ownership is the next clean backend step. |
| Proof surface | PASS | API controller source, backend build/tests, and static route scans provide enough evidence for the cutover. |

## Feasibility Matrix

| Part / Assumption | Risk | Proof Required | Evidence | Result |
| --- | --- | --- | --- | --- |
| Route ownership is already approved | HIGH | Contract map must explicitly assign each endpoint to a target controller. | `US-BC-001 contract-map.md` maps every learning route and marks legacy routes for removal in `US-BC-005`. | READY |
| Current API layer still mixes contexts | HIGH | Source scan must show one controller owning Flashcard, Practice, and Review routes. | `FlashcardsController` currently injects `IFlashcardService`, `IPracticeService`, and `IReviewService`, and exposes mixed route attributes. | READY |
| Practice and Review controllers can be split without repository/schema work | HIGH | Prior stories must already complete service and persistence ownership. | `US-BC-003` and `US-BC-004` completed repository and schema ownership before this cutover. | READY |
| Legacy route removal can be isolated from frontend rewrites | HIGH | Stale client/test references must be visible and deferred explicitly. | E2E specs still reference `/api/v1/flashcards/practice-sessions`, `/api/v1/flashcards/sessions`, `/api/v1/flashcards/review`, and `/api/v1/flashcards/dashboard`. | READY WITH CONSTRAINTS |
| Settings routes can move without breaking profile aggregate endpoint | MEDIUM | `SettingsController` must be able to keep `GET /api/v1/settings` while learning settings move to dedicated controllers. | `SettingsController` already uses split Practice and Review services for aggregate settings composition. | READY |

## Test Plan

| Layer | Cases |
| --- | --- |
| API/build | API project compiles after controller split and route attribute changes. |
| Backend unit/integration | Existing backend tests plus any focused controller/API tests needed for surviving routes. |
| Static scan | Legacy route attributes disappear from backend controllers; target routes appear under correct controllers. |
| E2E | Not required in this story; stale references are expected until `US-BC-006`. |

## Commands

```text
rg -n "\\[Http(Get|Post|Put|Delete).*\\]|Route\\(|class .*Controller" src/backend/FluentA.API/Controllers -S
dotnet test src/backend/FluentA.Application.UnitTests/FluentA.Application.UnitTests.csproj
dotnet test src/backend/FluentA.Domain.UnitTests/FluentA.Domain.UnitTests.csproj
dotnet build src/backend/FluentA.API/FluentA.API.csproj --no-restore
.\scripts\bin\harness-cli.exe story verify US-BC-005
git diff --check
```

## Acceptance Evidence

To complete this story, record:

- `FlashcardsController` is Flashcard-read only
- `PracticeController` and `ReviewController` exist and own their routes
- legacy mixed `/api/v1/flashcards/*` learning compatibility routes are gone
- `GET /api/v1/settings` still works as aggregate profile/settings surface
- backend proof passes or unrelated failures are documented
