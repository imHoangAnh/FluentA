# Exec Plan

## Goal

Make repository and EF-backed persistence ownership match the Flashcard,
Practice, and Review application split from `US-BC-002`.

## Scope

In scope:

- Split repository interfaces by context.
- Split EF-backed repository implementations by context.
- Update application services to depend on context-owned repositories.
- Update DI and compile-time imports.
- Update backend unit tests/fakes to the new repository boundaries.
- Run focused backend tests, build proof, and static scans.

Out of scope:

- Controller route changes.
- Frontend client changes.
- PostgreSQL schema migration/table move work.
- Vocabulary sync/cleanup split.
- Behavior changes to review scheduling, random mode, or practice workflows.

## Risk Classification

Risk flags:

- Cross-cutting persistence contract changes.
- Infrastructure query/write ownership changes.
- Review due-queue and dashboard logic relocation.
- Existing tests currently rely on one mixed fake repository.

Lane: high-risk.

## Work Phases

1. Shrink `IFlashcardRepository` to Flashcard-only reads.
2. Add `IPracticeRepository` and `IReviewRepository` contracts.
3. Split the mixed EF implementation into context-owned repositories.
4. Move helper methods to the owning repository implementation.
5. Update `PracticeService` and `ReviewService` constructor dependencies.
6. Update DI registrations and API compile surfaces.
7. Update repository fakes and application tests.
8. Run static scans, backend tests, API build, Harness verify, and whitespace
   checks.
9. Record validation evidence and trace.

## Stop Conditions

Pause for human confirmation if:

- The split requires changing route/controller behavior before `US-BC-005`.
- Table/schema changes become necessary before `US-BC-004`.
- Vocabulary sync ownership must move now to keep compile/runtime behavior.
- Random mode, dashboard math, or review scheduling behavior would change.
