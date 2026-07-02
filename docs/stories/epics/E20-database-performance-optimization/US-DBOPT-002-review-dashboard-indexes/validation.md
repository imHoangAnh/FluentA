# Validation

## Proof Strategy

Apply the migration locally, inspect `pg_indexes`, and run baseline EXPLAIN
sections for review/dashboard queries.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | Application flashcard tests still pass. |
| Integration | EF database update applies concurrent index migration. |
| E2E | Existing focused Review/Practice workflow remains the behavioral proof if UI is exercised. |
| Platform | API build succeeds after migration. |
| Performance | Baseline report shows partial review indexes and no target FK-index gaps. |
| Logs/Audit | Harness trace records migration and index evidence. |

## Fixtures

- Current local Postgres database.

## Commands

```text
dotnet tool run dotnet-ef database update --project src/backend/FluentA.Infrastructure --startup-project src/backend/FluentA.API
.\scripts\database\collect-db-performance-baseline.ps1
```

## Acceptance Evidence

- `dotnet tool run dotnet-ef database update --project src/backend/FluentA.Infrastructure --startup-project src/backend/FluentA.API` passed and applied `20260702023905_OptimizeReviewDashboardIndexes`.
- EF warned that concurrent index SQL runs outside a transaction; this is
  expected for PostgreSQL `CREATE INDEX CONCURRENTLY` / `DROP INDEX
  CONCURRENTLY` and the migration is index-only.
- Live `pg_indexes` confirmed:
  - `IX_word_review_states_user_id_next_review_date` on
    `(user_id, next_review_date) WHERE deleted_at IS NULL`.
  - `IX_word_review_histories_user_id_reviewed_at_active` on
    `(user_id, reviewed_at) WHERE deleted_at IS NULL`.
  - `IX_word_review_histories_user_id_session_id` on
    `(user_id, session_id) WHERE deleted_at IS NULL`.
- Missing FK-index audit returned 0 rows.
- `dotnet test src/backend/FluentA.slnx --no-restore` passed: 46 Domain tests
  and 92 Application tests.
