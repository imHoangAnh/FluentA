# US-DBCLN-001 Validation

## Feasibility Result

`READY WITH CONSTRAINTS`

## Reality Gate

| Assumption | Risk | Evidence | Result |
| --- | --- | --- | --- |
| Local database is eligible for a clean baseline | deleting migration compatibility could strand real data | Live `fluenta_dev` has zero public application tables; `__EFMigrationsHistory` is absent; EF reports all 47 migrations pending | Ready for the approved local-only baseline |
| Flashcard projection storage has no product reader | removing it could break viewer or Practice | `EfFlashcardRepository` reads Boards, Pages, Words, review states, and Practice summaries; only `EfFlashcardVocabularySyncPort` references FlashcardDecks/Cards | Ready; remove the isolated sync writer |
| Legacy asset queue has no producer | removing it could leak stored objects | Active-code scan finds only the recurring consumer/job, configuration, and DbSet; no runtime add/insert path exists, and the empty database has no queue table | Ready for a fresh baseline |
| Review snapshot columns have no consumer | dropping them could break summaries/dashboard | Review queries read history Result, TimeSpentSeconds, UserId, SessionId, WordId, ReviewedAt, and DeletedAt; `LevelBefore`, `LevelAfter`, and history `NextReviewDate` are only assigned/mapped | Ready; preserve the active summary fields |
| Current source builds before cleanup | pre-existing failures could mask regressions | Domain 40/40 and Application 127/127 passed; API build passed with two existing dependency advisories | Ready with unrelated frontend constraints |
| EF tooling can observe the final state | a baseline could compile but drift from the model | Current migration script generation passed and `has-pending-model-changes` reports no model drift | Ready |

## Constraints

- This story is valid only for the empty local `fluenta_dev` database.
- No staging/production upgrade path is claimed.
- `src/frontend/src/features/todo/pages/TodoPage.tsx` is unrelated and must not
  be changed.
- There is no `FluentA.Worker` project in the current repository. Recurring-job
  proof must use the API build, registration tests/static scan, and runtime
  registration where available.
- Baseline frontend lint stops on the unrelated Todo `formatDay` unused
  declaration. Baseline Vitest reports 69/69 assertions passed but exits 1
  because one worker process terminated after the test run. Focused learning
  tests and a post-change retry are required; neither baseline issue may be
  attributed to this backend/schema story.

## Baseline Evidence

Recorded 2026-07-21 before source implementation:

- PostgreSQL container `fluenta-postgres`: healthy.
- `fluenta_dev`: zero public application tables.
- `public.__EFMigrationsHistory`: absent.
- EF migrations: 47 pending; current model has no pending changes.
- EF full migration SQL generation: passed.
- Domain unit tests: 40/40 passed.
- Application unit tests: 127/127 passed.
- API build: passed with existing AngleSharp moderate and Microsoft.OpenApi
  high advisories.
- Frontend lint: blocked only by the unrelated dirty Todo file.
- Frontend Vitest: 69/69 assertions passed, but the command exited 1 after one
  worker process terminated unexpectedly.

## Planned Proof

```text
dotnet test src/backend/FluentA.Domain.UnitTests/FluentA.Domain.UnitTests.csproj
dotnet test src/backend/FluentA.Application.UnitTests/FluentA.Application.UnitTests.csproj
dotnet build src/backend/FluentA.API/FluentA.API.csproj
dotnet ef migrations script
dotnet ef database update
dotnet ef migrations has-pending-model-changes
psql information_schema and __EFMigrationsHistory queries
npm run test:run (retry plus focused learning tests)
git diff --check
```

## Authorized Story

`US-DBCLN-001` is the smallest coherent slice: persistence cleanup without its
baseline would leave the migration chain recreating retired storage, while a
baseline without the code cleanup would recreate it from the EF model. No
adjacent product redesign is required.

## Acceptance Evidence

`IMPLEMENTED AND REVIEWED`

No P1 or P2 finding remains in the approved local-only story.

| Acceptance criterion | Evidence | Result |
| --- | --- | --- |
| Vocabulary pages remain Flashcard/Practice Page Decks | Live authenticated API smoke created Board -> Page -> Word; Flashcard library and page-session reads returned the same page id and one live vocabulary word with exact IPA | Passed |
| No Flashcard projection persistence | Active-code scan is clean; live `to_regclass` returns null for `flashcard_decks` and `flashcard_cards` | Passed |
| No legacy asset deletion queue | Entity, DbSet, configuration, consumer method, interface member, and recurring registration are removed; live `to_regclass` returns null | Passed |
| Reduced Review history remains functional | Live Practice enrollment -> due Review session -> Correct submit returned Level 0 -> 1; summary and dashboard each reported one review; PostgreSQL stored result, three seconds, session id, and reviewed timestamp | Passed |
| One current baseline migration | Migration directory contains `InitialBaseline`, designer, and model snapshot only; EF history contains exactly one applied migration | Passed |
| Approved columns are absent | Live `word_review_histories` has ten retained columns and omits `level_before`, `level_after`, and `next_review_date`; review-state date columns remain PostgreSQL `date` | Passed |
| Model and database agree | EF reports no pending model changes; idempotent script generation passed; repeated database update reports up to date | Passed |
| Product and architecture truth agree | Flashcard, learning-workflow, asset, architecture, E32 supersession, ADR 0044 fulfillment, and ADR 0052 documents are reconciled | Passed |

## Executed Proof

- Domain unit tests: 38/38 passed after retiring two projection-specific tests.
- Application unit tests: 127/127 passed; focused Vocabulary tests: 17/17.
- API build: passed with zero errors.
- EF `InitialBaseline`: applied successfully to the confirmed-empty local
  PostgreSQL database.
- EF `has-pending-model-changes`: no model changes.
- EF migration list: exactly `20260720214349_InitialBaseline`, applied.
- EF idempotent migration script generation: passed.
- Live schema: 28 product tables plus `__EFMigrationsHistory`; all three
  removed tables are absent.
- Live Review schema: history snapshot columns absent; state due/last-reviewed
  columns remain `date`.
- Authenticated API/database smoke: register/verify/login, Vocabulary
  Board/Page/Word create, Flashcard library/session reads, Practice settings,
  Add to Review, Review session/submit/summary/dashboard all passed.
- Smoke data cleanup: the one test user and its Board/Page/Word/Review rows were
  removed; product row count returned to zero while the baseline migration
  remained applied.
- Frontend Vitest with one worker: 18/18 files and 69/69 tests passed.
- Scoped stale-reference scan and `git diff --check`: passed. Historical story
  and decision records remain only where they describe superseded behavior.
- Harness story verification passed; Trace `#210` reached the required detailed
  tier for the high-risk lane.

## Known Warnings And Unrelated Findings

- The standard parallel Vitest pool remains unstable on this machine; two runs
  ended after a fork worker exited unexpectedly. Running the same complete
  suite with `--maxWorkers=1` passed 69/69.
- Global frontend lint remains blocked only by the unrelated dirty
  `TodoPage.tsx` unused `formatDay` declaration. That file was not edited by
  this story.
- API restore/build reports existing AngleSharp moderate and Microsoft.OpenApi
  high dependency advisories. Dependency upgrades are outside this approved
  schema cleanup.
- PostgreSQL and Redis local containers remain healthy/running. The temporary
  API smoke process was stopped.

## Review Finding Summary

- P1: none.
- P2: none.
- P3: none inside the approved story.
