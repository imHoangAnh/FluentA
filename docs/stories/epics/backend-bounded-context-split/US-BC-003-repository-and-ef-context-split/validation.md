# Validation

## Proof Strategy

Prove the story is ready for execution by checking that the remaining mixed
persistence surface is isolated, the repository split can happen without public
route or schema changes, and current tests/builds provide enough proof for the
cutover.

## Reality Gate

| Gate | Result | Evidence |
| --- | --- | --- |
| Mode fit | PASS | This is the next high-risk source refactor after `US-BC-002` and changes persistence boundaries. |
| Repo fit | PASS | The codebase still exposes one mixed repository and one mixed EF implementation that can be split. |
| Assumptions | PASS WITH CONSTRAINTS | Route cutover, schema move, and Vocabulary split stay deferred to later approved stories. |
| Smaller path | PASS | Repository/EF split is the smallest next step after application split and before controller/schema cutovers. |
| Proof surface | PASS | Backend unit tests and API build already exercise the affected application contracts. |

## Feasibility Matrix

| Part / Assumption | Risk | Proof Required | Evidence | Result |
| --- | --- | --- | --- | --- |
| Flashcard, Practice, and Review methods can be separated into distinct repository interfaces | HIGH | Current method ownership is already mapped and application services are already split. | `contract-map.md` assigns every persistence method to a target context and `US-BC-002` created `IPracticeService` and `IReviewService`. | READY |
| Mixed EF repository can be cut into context-owned classes without schema change | HIGH | Current `EfFlashcardRepository` methods are separable by responsibility. | Static scan shows Flashcard read helpers, Practice summary/settings methods, and Review session/dashboard/SRS helpers grouped inside one file. | READY |
| Practice can stop depending on the mixed repository | HIGH | `PracticeService` only needs practice summary/settings plus Review enrollment. | Current constructor still uses `IFlashcardRepository`, but `IReviewEnrollmentPort` already exists. | READY |
| Review can own enrollment, session, dashboard, and answer persistence | HIGH | Review service/repository boundary can absorb the current helper set unchanged. | `PickRandomReviewMode`, `CountCurrentStreakAsync`, `HasReviewOnLocalDateAsync`, dashboard aggregation, and review writes already live together. | READY |
| EF configuration/file structure can remain stable while ownership is clarified | MEDIUM | No migration or model change is required for this story. | `AppDbContext` and configuration classes already compile against the moved entity namespaces from `US-BC-002`. | READY WITH CONSTRAINTS |
| Existing tests can be adapted to new repository seams | MEDIUM | Current fake repository can be split into smaller fakes or multi-interface test doubles. | `FlashcardServiceTests` already centralizes the fake repository and constructor helpers. | READY |

## Test Plan

| Layer | Cases |
| --- | --- |
| Application unit | Flashcard read methods, Practice summary/settings methods, Add to Review delegation, Review settings/session/dashboard/review answer methods. |
| Build | API project compiles after DI and infrastructure split. |
| Static scan | `IFlashcardRepository` no longer exposes Practice/Review methods; `PracticeService` and `ReviewService` no longer depend on it. |
| Architecture scan | Mixed `EfFlashcardRepository` ownership is removed or reduced to Flashcard-only read behavior. |
| E2E | Not required; public routes remain unchanged in this story. |

## Commands

```text
rg -n "interface IFlashcardRepository|interface IPracticeRepository|interface IReviewRepository|class EfFlashcardRepository|class EfPracticeRepository|class EfReviewRepository|PracticeService\\(|ReviewService\\(" src/backend -S
dotnet test src/backend/FluentA.Application.UnitTests/FluentA.Application.UnitTests.csproj
dotnet test src/backend/FluentA.Domain.UnitTests/FluentA.Domain.UnitTests.csproj
dotnet build src/backend/FluentA.API/FluentA.API.csproj --no-restore
.\scripts\bin\harness-cli.exe story verify US-BC-003
git diff --check
```

## Acceptance Evidence

To complete this story, record:

- `IFlashcardRepository`, `IPracticeRepository`, and `IReviewRepository` are
  context-owned and minimal.
- `PracticeService` and `ReviewService` no longer depend on the mixed
  repository.
- Infrastructure implementations are context-owned and no single repository
  class owns all Flashcard, Practice, and Review behavior.
- No public route or schema/table change is included.
- Focused backend tests/build pass or unrelated failures are documented.
