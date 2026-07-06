# Design

## Domain Boundary

Create or move domain types so ownership matches `US-BC-001`:

| Target context | Domain types |
| --- | --- |
| Flashcards | `FlashcardDeck`, `FlashcardCard`, `DeckType`, Flashcard-only card read-model values that remain necessary. |
| Practice | `PracticeSettings`, `PracticeSessionSummary`, `PracticeMode`. |
| Review | `ReviewSettings`, `WordReviewState`, `WordReviewHistory`, `FluentAsrsReviewResult`, `FluentAsrsScheduler`, `FluentAsrsResult`, Review time helper if kept in application layer. |

Legacy candidates must be explicitly resolved:

- `CardReview`
- `CardState`
- `ReviewRating`

If still referenced by active code, keep the type with its current behavior and
move it to the most accurate owner. If unused, remove it only when compile and
tests prove it is no longer required.

## Application Boundary

Split the current application surface into context-owned contracts:

| Target context | Application contracts |
| --- | --- |
| Flashcards | `IFlashcardService`, Flashcard DTOs, Flashcard read methods, Flashcard repository read port. |
| Practice | `IPracticeService`, Practice DTOs, Practice settings methods, Practice summary methods, `IReviewEnrollmentPort` call site contract for Add to Review. |
| Review | `IReviewService`, Review DTOs, Review settings/session/answer/dashboard methods, Review-owned enrollment port implementation contract. |

Because repository/EF split is `US-BC-003`, this story may temporarily keep an
adapter/facade over the existing repository only when necessary to preserve
compile and behavior. Any temporary adapter must be named as migration
scaffolding and must not become the final Feature 20 architecture.

## Error And Helper Ownership

- Replace Flashcard-specific error naming in Practice/Review application
  services with context-local error types or neutral shared `OperationResult`
  usage.
- Keep `OperationResult<T>` in `FluentA.Application.Common`.
- Do not create a shared Learning kernel.
- Duplicate small helpers or map through explicit contracts when Practice and
  Review need similar values.

## Test Boundary

Split or rename tests so behavior is visible by context:

- Flashcard read behavior
- Practice settings/session behavior
- Review settings/session/dashboard/SRS behavior
- Domain SRS tests under Review naming

The implementation does not need new user-facing tests, but it must keep or
improve focused backend unit test coverage for the moved contracts.

## Interface Contract

No public HTTP route changes in this story. Existing API controllers may compile
against the new application services or a temporary composition path until
`US-BC-005`.

## Data Model

No EF migration or schema/table change in this story.

## Alternatives Considered

1. Split all repository and EF implementation at the same time.
   Rejected because `US-BC-003` owns repository/EF split and this story should
   keep the first source refactor reviewable.
2. Keep one mixed `FlashcardService` facade forever.
   Rejected because Feature 20 requires each context to own its application
   service and later each controller to call only its matching service.
3. Introduce a shared Learning kernel for common modes/time helpers.
   Rejected because Feature 20 locks explicit contracts and duplication of
   small values over a shared kernel.
