# Validation Report

## Outcome

`US-BC-003` is complete and verified.

The repository split now matches the application split from `US-BC-002`:

- `IFlashcardRepository` is Flashcard-read only.
- `IPracticeRepository` owns practice summary/settings persistence.
- `IReviewRepository` owns review enrollment, session, dashboard, settings, and
  review-answer persistence.
- `PracticeService` and `ReviewService` no longer depend on the mixed
  Flashcard repository.
- EF-backed infrastructure is split into `EfFlashcardRepository`,
  `EfPracticeRepository`, and `EfReviewRepository`.

## Reality Gate Results

| Gate | Result | Notes |
| --- | --- | --- |
| Mode fit | PASS | High-risk persistence-boundary change implemented in the approved Feature 20 order. |
| Repo fit | PASS | The repository and EF ownership split was completed without controller or schema changes. |
| Assumptions | PASS | Route cutover, schema move, and Vocabulary ownership split remain deferred to later stories. |
| Smaller path | PASS | This stayed scoped to repository contracts, EF implementations, DI, and tests. |
| Proof surface | PASS | Application tests, domain tests, API build, static scans, and Harness story verify all passed. |

## Key Evidence

| Check | Result | Evidence |
| --- | --- | --- |
| Flashcard repository contract is minimal | PASS | `src/backend/FluentA.Application/BoundedContexts/Flashcards/IFlashcardRepository.cs` now exposes only `ListDecksAsync` and `GetDeckSessionAsync`. |
| Practice repository contract exists | PASS | `src/backend/FluentA.Application/BoundedContexts/Practice/IPracticeRepository.cs` owns practice summary/settings persistence methods. |
| Review repository contract exists | PASS | `src/backend/FluentA.Application/BoundedContexts/Review/IReviewRepository.cs` owns review enrollment/session/settings/dashboard/review-write methods. |
| Practice service no longer depends on Flashcard repository | PASS | `src/backend/FluentA.Application/BoundedContexts/Practice/PracticeService.cs` now injects `IPracticeRepository` plus `IReviewEnrollmentPort`. |
| Review service no longer depends on Flashcard repository | PASS | `src/backend/FluentA.Application/BoundedContexts/Review/ReviewService.cs` now injects `IReviewRepository`. |
| Infrastructure ownership is split | PASS | `src/backend/FluentA.Infrastructure/Flashcards/EfFlashcardRepository.cs`, `src/backend/FluentA.Infrastructure/Practice/EfPracticeRepository.cs`, and `src/backend/FluentA.Infrastructure/Review/EfReviewRepository.cs` now separate Flashcard, Practice, and Review persistence paths. |
| DI reflects the new seams | PASS | `src/backend/FluentA.Infrastructure/DependencyInjection.cs` now registers all three repositories explicitly. |
| Test seam is updated | PASS | `src/backend/FluentA.Application.UnitTests/FlashcardServiceTests.cs` now uses separate practice/review test doubles instead of one mixed repository fake. |
| No public route or schema change was introduced | PASS | Controllers and `AppDbContext` route/table ownership remained stable; this story only changed repository seams. |

## Commands Run

```text
dotnet test src/backend/FluentA.Application.UnitTests/FluentA.Application.UnitTests.csproj
dotnet test src/backend/FluentA.Domain.UnitTests/FluentA.Domain.UnitTests.csproj
dotnet build src/backend/FluentA.API/FluentA.API.csproj --no-restore
rg -n "interface IFlashcardRepository|interface IPracticeRepository|interface IReviewRepository|class EfFlashcardRepository|class EfPracticeRepository|class EfReviewRepository|PracticeService\\(|ReviewService\\(" src/backend -S
rg -n "IFlashcardRepository.*CreatePracticeSessionSummaryAsync|IFlashcardRepository.*CreateReviewSessionAsync|private readonly IFlashcardRepository _repository" src/backend -S
.\scripts\bin\harness-cli.exe story verify US-BC-003
git diff --check
```

## Verification Results

| Check | Result |
| --- | --- |
| Application unit tests | PASS (103/103) |
| Domain unit tests | PASS (49/49) |
| API build | PASS |
| Harness story verify | PASS |
| `git diff --check` | PASS with existing LF/CRLF warnings only |
| Build warnings | Existing `NU1903` warning for `Microsoft.OpenApi` remains; not introduced by this story |

## Constraints Preserved

- No public API route change.
- No schema/table/migration change.
- No Practice mode behavior change.
- No Review random-mode behavior change.
- No dashboard or FluentA SRS rule change.
- No Vocabulary sync ownership cutover.
