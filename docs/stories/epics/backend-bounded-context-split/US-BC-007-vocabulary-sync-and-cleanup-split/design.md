# Design

## Ownership Split

Introduce two synchronous application ports:

| Port | Owner | Responsibility |
| --- | --- | --- |
| `IFlashcardVocabularySyncPort` | Flashcard | page-deck create/rename/delete, card upsert/delete, active deck lookup for notifier fanout |
| `IVocabularyReviewCleanupPort` | Review | remove review state and review history for deleted vocabulary words |

Vocabulary keeps orchestration but stops importing Flashcard and Review domain
types through its repository contract.

## Transaction Shape

`VocabularyService` becomes the orchestration boundary for mixed-context
changes that must still commit atomically:

1. mutate Vocabulary entities through `IVocabularyRepository`
2. invoke Flashcard and/or Review ports synchronously
3. call `IVocabularyRepository.SaveChangesAsync`
4. publish existing post-commit notifier events

This keeps the current modular-monolith transaction shape without adding a
broker, outbox, or async eventual-consistency path.

## Infrastructure Split

`EfVocabularyRepository` should own only Vocabulary persistence:

- board/page/word CRUD and soft delete
- custom columns, custom values, and visibility
- `SaveChangesAsync` wrapper for service-level commit orchestration

`EfFlashcardVocabularySyncPort` owns:

- active page-deck lookup
- page-deck create/rename/soft delete
- per-word Flashcard card upsert/delete

`EfVocabularyReviewCleanupPort` owns:

- `WordReviewState` deletion
- `WordReviewHistory` deletion

## Constraints

Do not:

- reintroduce Flashcard or Review entity imports into `IVocabularyRepository`
  or `EfVocabularyRepository`
- move notifier publishing before the shared save
- weaken deleted-row cleanup rules for card or review progress removal
- add asynchronous messaging for this story
