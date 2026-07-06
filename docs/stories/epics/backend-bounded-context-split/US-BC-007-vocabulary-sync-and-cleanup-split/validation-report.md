# Validation Report

## Outcome

`US-BC-007` is implemented with focused backend proof.

Vocabulary sync and cleanup responsibilities now flow through context-owned
ports. Flashcard owns page deck and card synchronization, Review owns review
progress cleanup, and the Vocabulary repository no longer carries Flashcard or
Review persistence logic.

## Key Evidence

| Check | Result | Evidence |
| --- | --- | --- |
| Vocabulary repository contract is Vocabulary-only | PASS | `IVocabularyRepository` dropped `FlashcardDeck`, `ListActiveDeckIdsAsync`, and mixed sync helpers; it now exposes `AddPageAsync` and `SaveChangesAsync`. |
| Flashcard sync moved behind a dedicated port | PASS | Added `IFlashcardVocabularySyncPort` plus `EfFlashcardVocabularySyncPort` for page-deck lifecycle, card upsert/delete, and active deck lookup. |
| Review cleanup moved behind a dedicated port | PASS | Added `IVocabularyReviewCleanupPort` plus `EfVocabularyReviewCleanupPort`, and cleanup now removes both `WordReviewState` and `WordReviewHistory`. |
| Vocabulary repository no longer imports Flashcard/Review internals | PASS | Static scan `rg -n "using FluentA\\.Domain\\.BoundedContexts\\.(Flashcards|Review)" src/backend/FluentA.Infrastructure/Vocabulary/EfVocabularyRepository.cs -S` returned no matches. |
| Focused Vocabulary orchestration proof passed | PASS | `dotnet test src/backend/FluentA.Application.UnitTests/FluentA.Application.UnitTests.csproj --filter VocabularyServiceTests` passed 13/13. |
| Backend composition proof passed | PASS | `dotnet build src/backend/FluentA.API/FluentA.API.csproj --no-restore` passed after wiring the new ports in `DependencyInjection.cs`. |
| Runtime integration proof for live create/update/delete was executed | NO | This story currently has focused unit/build/static proof only. Live API/PostgreSQL create-update-delete smoke remains a release-level follow-up candidate for `US-BC-008`. |

## Constraints And Follow-up

- The implementation preserves the in-process synchronous transaction shape
  rather than introducing async messaging or an outbox.
- Release proof should still exercise live board/page/word create-update-delete
  flows to confirm owner/deleted-row behavior through the running API and
  PostgreSQL runtime.
