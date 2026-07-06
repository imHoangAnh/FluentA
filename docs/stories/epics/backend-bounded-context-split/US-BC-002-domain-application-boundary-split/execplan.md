# Exec Plan

## Goal

Move/split domain and application contracts so Flashcard, Practice, and Review
exist as separate backend bounded contexts while preserving current behavior.

## Scope

In scope:

- Domain namespace/file split for Flashcard, Practice, and Review-owned types.
- Application DTO/service/port split for Flashcard, Practice, and Review.
- Temporary compile adapters only where needed before repository/API split.
- Unit test namespace and fixture updates.
- Compile and targeted backend unit tests.

Out of scope:

- Infrastructure repository split.
- EF `DbSet`, configuration, migration, or schema changes.
- Controller route cutover or legacy endpoint removal.
- Frontend endpoint changes.
- Vocabulary sync handler split.

## Risk Classification

Risk flags:

- Cross-cutting namespace moves.
- Application contract changes.
- Existing behavior.
- Tests currently grouped by old context.
- Infrastructure and API still compile against old names until later stories.

Lane: high-risk.

## Work Phases

1. Inventory active references to Flashcards domain/application namespaces.
2. Move domain types to target contexts or remove proven-unused legacy types.
3. Split DTOs into Flashcard, Practice, and Review application DTO folders.
4. Split application service interfaces and service classes by context.
5. Add `IReviewEnrollmentPort` or equivalent explicit Practice-to-Review
   contract, but keep implementation minimal until repository split.
6. Update API/infrastructure/test imports only as needed to compile without
   changing runtime endpoint behavior.
7. Split or rename backend unit tests to prove the moved contracts still behave.
8. Run targeted backend tests and build checks.
9. Record Harness evidence.

## Stop Conditions

Pause for human confirmation if:

- Repository/EF split becomes unavoidable to compile.
- Controller route behavior must change before `US-BC-005`.
- Frontend changes become required before `US-BC-006`.
- Vocabulary sync handler split becomes required before `US-BC-007`.
- The implementation would require changing Practice mode, SRS scheduling, or
  Review random-mode semantics.
