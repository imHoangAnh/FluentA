# Validation

## Proof Strategy

Prove the story is ready for source execution by checking that the current code
surface is discoverable, the split can be scoped to domain/application
contracts, and repository/API/EF/frontend changes can remain deferred.

## Reality Gate

| Gate | Result | Evidence |
| --- | --- | --- |
| Mode fit | PASS | This is the first source-code refactor in a high-risk backend split. |
| Repo fit | PASS | Current mixed Flashcards domain/application files and unit tests exist. |
| Assumptions | PASS WITH CONSTRAINTS | Repository/API/EF/frontend cutovers are explicitly out of scope. |
| Smaller path | PASS | Splitting domain/application contracts before repository/API cutover is the smallest safe source change. |
| Proof surface | PASS | Existing unit tests cover Flashcard, Practice, Review settings/session, ReviewTime, and SRS behavior. |

## Feasibility Matrix

| Part / Assumption | Risk | Proof Required | Evidence | Result |
| --- | --- | --- | --- | --- |
| Domain types can be assigned to contexts | HIGH | Current domain files are separable by ownership. | `FlashcardDeck`, `FlashcardCard`, `PracticeSettings`, `PracticeSessionSummary`, `ReviewSettings`, `WordReviewState`, `WordReviewHistory`, `FluentAsrsScheduler` exist. | READY |
| Application contracts can be split without endpoint changes | HIGH | Controller route behavior can remain while services/contracts split. | `FlashcardsController` currently calls service methods; route cutover is assigned to `US-BC-005`. | READY WITH CONSTRAINTS |
| Repository/EF split can be deferred | HIGH | This story can keep temporary adapter paths over existing repository interfaces until `US-BC-003`. | `US-BC-001` assigns repository/EF split to `US-BC-003`. | READY WITH CONSTRAINTS |
| Tests can prove behavior after namespace split | MEDIUM | Unit tests already cover key application/domain behavior. | `FlashcardServiceTests` and `VocabularyTests` include Practice, Review, ReviewTime, and SRS assertions. | READY |
| Legacy types can be resolved safely | MEDIUM | Usage scan can identify active references. | `CardReview`, `CardState`, and `ReviewRating` are named legacy candidates in `contract-map.md`. | READY WITH CONSTRAINTS |

## Test Plan

| Layer | Cases |
| --- | --- |
| Domain unit | FluentA SRS scheduler, Review settings, Word review state/history, Flashcard deck/card, Practice settings/summary. |
| Application unit | Flashcard read service, Practice settings/session validation, Add to Review port delegation, Review settings/session/dashboard/review answer validation. |
| Build | Backend application/domain/API/infrastructure projects compile after namespace split. |
| Static scan | Old mixed namespace references are either gone from domain/application or explicitly constrained to temporary API/infrastructure adapters. |
| E2E | Not required; public routes and frontend behavior are unchanged in this story. |

## Commands

```text
rg -n "BoundedContexts\.Flashcards" src/backend/FluentA.Domain src/backend/FluentA.Application -S
dotnet test src/backend/FluentA.Domain.UnitTests/FluentA.Domain.UnitTests.csproj
dotnet test src/backend/FluentA.Application.UnitTests/FluentA.Application.UnitTests.csproj
dotnet build src/backend/FluentA.API/FluentA.API.csproj --no-restore
.\scripts\bin\harness-cli.exe story verify US-BC-002
git diff --check
```

## Acceptance Evidence

To complete this story, record:

- Flashcard, Practice, and Review domain/application folders exist with
  context-owned contracts.
- `IPracticeService`, `IReviewService`, and `IReviewEnrollmentPort` or an
  equivalent explicit Practice-to-Review application contract exist.
- Current HTTP route behavior is unchanged.
- No EF migration/schema/table change is included.
- Unit tests/build pass or any unrelated failure is documented with evidence.
- Static scan documents any intentionally temporary old-context references.
