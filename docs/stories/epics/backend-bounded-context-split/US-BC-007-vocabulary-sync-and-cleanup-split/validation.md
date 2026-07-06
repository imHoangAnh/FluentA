# Validation

## Proof Strategy

Prove that Vocabulary now orchestrates context-owned side effects through
ports, and that the old repository hot spot no longer reaches into Flashcard
or Review persistence directly.

## Test Plan

| Layer | Cases |
| --- | --- |
| Static architecture scan | `EfVocabularyRepository` no longer imports Flashcard or Review entities and no longer contains deck/card/review cleanup logic. |
| Application proof | Vocabulary service tests cover page-deck creation, word sync notifications, and review cleanup dispatch on delete flows. |
| Backend compile proof | API build passes with the new ports wired through DI. |
| Integration gap check | Record clearly whether runtime create/update/delete proof was executed for this story or deferred to `US-BC-008`. |

## Commands

```text
rg -n "using FluentA\\.Domain\\.BoundedContexts\\.(Flashcards|Review)" src/backend/FluentA.Infrastructure/Vocabulary/EfVocabularyRepository.cs -S
dotnet test src/backend/FluentA.Application.UnitTests/FluentA.Application.UnitTests.csproj --filter VocabularyServiceTests
dotnet build src/backend/FluentA.API/FluentA.API.csproj --no-restore
git diff --check
```

## Acceptance Evidence

To complete this story, record:

- Vocabulary repository interfaces no longer depend on Flashcard/Review domain
  types
- Flashcard owns deck/card sync behind a dedicated port
- Review cleanup removes both state and history behind a dedicated port
- focused Vocabulary unit tests pass on the new orchestration shape
- API build passes with DI wiring
- any remaining integration-proof gap is stated explicitly
