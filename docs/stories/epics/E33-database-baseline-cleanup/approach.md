# E33 Database Baseline Cleanup Approach

## Recommended Path

Deliver one high-risk vertical story, `US-DBCLN-001`, because the code cleanup
and migration baseline must describe exactly the same final EF model.

1. Remove the obsolete Flashcard projection entities, configurations, DbSets,
   DI registration, and Vocabulary sync calls. Preserve vocabulary transaction
   behavior and emit the existing Flashcard invalidation with the page id.
2. Remove the legacy asset deletion queue entity/configuration/DbSet, recurring
   registration, interface member, and worker implementation.
3. Simplify `WordReviewHistory` and its creation call to omit the three unused
   SRS snapshot values while preserving result/time/session queries.
4. Delete the old migration source set and model snapshot, then scaffold one
   `InitialBaseline` migration from the cleaned model.
5. Apply the baseline to the confirmed-empty local database and inspect the
   resulting tables, columns, constraints, and EF history.
6. Reconcile product docs, architecture/decision truth, story validation, and
   Harness proof.

## Rejected Alternatives

1. **Add a 48th forward migration.** Rejected because the approved target is an
   empty local database and the user explicitly selected a clean baseline.
2. **Keep flashcard projection tables with fewer columns.** Rejected because
   active Flashcard and Practice reads already use vocabulary pages and words;
   a reduced projection would retain duplicate ownership without a consumer.
3. **Drop `word_review_histories`.** Rejected because current Review queries
   use it for per-session summary, dashboard results, and reviewed-day checks.
4. **Keep the legacy asset queue for possible future import.** Rejected by the
   approved local-only scope; fresh runtime code has no producer for it.
5. **Remove generic audit columns across all entities.** Rejected because that
   would broaden the story beyond workflow-obsolete storage and weaken shared
   lifecycle conventions without product evidence.

## Risks And Required Proof

| Risk | Cause and effect | Required proof |
| --- | --- | --- |
| Vocabulary CRUD regression | removing sync dependencies can change transaction or notification flow | focused Vocabulary application tests and Flashcard/Practice read tests |
| Review regression | history constructor/schema changes can break answer persistence and aggregate queries | focused Review unit tests plus live API/database smoke |
| Incomplete baseline | stale model configuration can silently recreate removed tables/columns | EF pending-model check, migration SQL scan, and live `information_schema` inspection |
| Lost worker startup | deleting one recurring method can break interface implementation or registration | Worker/API builds and recurring-registration tests |
| Accidental compatibility claim | a squashed baseline cannot upgrade an existing deployed schema | tracked local-only constraint and one-row EF history proof |
| Unrelated dirty-file damage | broad cleanup can overwrite user Todo changes | path-scoped edits and final `git status` verification |

## Expected Integration Boundaries

- Domain: Flashcard projection entity removal and slimmer Review history.
- Application: Vocabulary side-effect removal and Review repository contract
  adjustment; current notifier contract remains.
- Infrastructure: EF DbContext/configuration cleanup, worker job cleanup, and
  new baseline migration.
- API/Worker: DI and recurring registration cleanup.
- Tests: Vocabulary, Review, worker registration, EF migration/schema proof.
- Docs: `docs/product/flashcards.md`, `docs/product/learning-workflows.md`,
  decision `0044`, and a baseline-specific decision record.

## Story Exit State

- The migration directory contains one baseline migration plus its snapshot.
- A fresh local `fluenta_dev` database applies it successfully.
- `flashcard_decks`, `flashcard_cards`, and
  `legacy_asset_deletion_queue` do not exist.
- `word_review_histories` exists without `level_before`, `level_after`, or
  `next_review_date`.
- EF reports no pending model changes and all affected automated proof passes.
