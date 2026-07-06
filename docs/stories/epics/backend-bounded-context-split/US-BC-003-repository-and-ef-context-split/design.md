# Design

## Repository Ownership

Split the current mixed persistence contract into context-owned interfaces:

| Context | Repository contract |
| --- | --- |
| Flashcard | `IFlashcardRepository` with deck/session read methods only. |
| Practice | `IPracticeRepository` with practice summary/settings writes and reads. |
| Review | `IReviewRepository` with review settings, session creation, summary, dashboard, review answer persistence, and enrollment. |

`PracticeService` must depend on `IPracticeRepository` plus
`IReviewEnrollmentPort`.

`ReviewService` must depend on `IReviewRepository` and continue implementing
`IReviewEnrollmentPort`.

## Infrastructure Ownership

Replace the one mixed EF implementation with context-owned repository classes:

| Context | Candidate implementation |
| --- | --- |
| Flashcard | `EfFlashcardRepository` or equivalent Flashcard-only read repository. |
| Practice | `EfPracticeRepository`. |
| Review | `EfReviewRepository`. |

Exact file names may follow existing repo conventions, but the implementation
must make ownership visible in code and DI.

Private helpers should live with the owning context:

- Flashcard projection helpers such as `ToCardDto` and review-state read
  projection helpers used only for Flashcard card output stay with Flashcard.
- Review helpers such as random mode selection, streak counting, dashboard
  percentages, and due-queue logic move under Review-owned infrastructure.
- Practice validation/query helpers stay with Practice-owned infrastructure.

## EF Configuration Scope

This story does not move tables or schemas, but it should make ownership easier
to see in infrastructure:

- Keep `AppDbContext` `DbSet`s unchanged.
- Keep current table names and entity configurations unchanged in behavior.
- It is acceptable to keep the existing shared `Configurations` folder if
  classes and imports already reflect the correct entity owner.
- If a small folder move or namespace change improves clarity without migration
  risk, it is allowed, but it is not required.

The important boundary is repository/query/write ownership, not a cosmetic EF
folder reshuffle.

## Dependency Injection

`DependencyInjection` should register:

- `IFlashcardRepository`
- `IPracticeRepository`
- `IReviewRepository`
- `IFlashcardService`
- `IPracticeService`
- `IReviewService`
- `IReviewEnrollmentPort` resolved from the Review service or Review repository
  owner path chosen by the application layer

Do not keep a mixed persistence facade after this story.

## Tests

Update backend tests so they prove:

- Flashcard services only require the Flashcard repository contract.
- Practice services require Practice repository plus Review enrollment port.
- Review services require Review repository.
- Repository fakes reflect the new ownership boundaries.

No new E2E or frontend proof is required in this story.

## Alternatives Considered

1. Keep one EF repository and only rename interfaces.
   Rejected because Feature 20 needs real ownership boundaries, not just
   application-layer labels.
2. Move schemas and controllers in the same story.
   Rejected because `US-BC-004` and `US-BC-005` already own those cutovers and
   combining them would raise rollback and review risk.
3. Create a shared Learning persistence kernel for cross-context helpers.
   Rejected because Feature 20 explicitly prefers explicit boundaries over a
   shared internal kernel.
