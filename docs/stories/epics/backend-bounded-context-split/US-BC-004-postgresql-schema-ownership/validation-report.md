# Validation Report

## Outcome

`US-BC-004` is complete and verified.

The learning persistence model now owns explicit PostgreSQL schemas:

- Flashcard: `flashcards.decks`, `flashcards.cards`
- Practice: `practice.settings`, `practice.session_summaries`
- Review: `review.settings`, `review.word_states`, `review.word_histories`

The generated EF migration was reviewed and converted to a preserve-data table
rename/schema-move path instead of a drop-and-recreate path for the active
learning tables.

## Reality Gate Results

| Gate | Result | Notes |
| --- | --- | --- |
| Mode fit | PASS | High-risk schema ownership and migration story completed in isolation from route/frontend work. |
| Repo fit | PASS | EF configurations, snapshot, and migration lineage were updated successfully. |
| Assumptions | PASS | API/frontend/Vocabulary cutovers stayed out of scope. |
| Smaller path | PASS | The story stayed focused on schema ownership, migration, and legacy table resolution. |
| Proof surface | PASS | Backend tests, API build, migration script generation, static scans, and Harness verify passed. |

## Key Evidence

| Check | Result | Evidence |
| --- | --- | --- |
| EF configurations target owned schemas | PASS | Learning configuration files now map to `decks/cards` in `flashcards`, `settings/session_summaries` in `practice`, and `settings/word_states/word_histories` in `review`. |
| Snapshot matches new ownership | PASS | `src/backend/FluentA.Infrastructure/Persistence/Migrations/AppDbContextModelSnapshot.cs` now reflects the split Practice/Review namespaces and owned schemas. |
| Migration preserves active learning data | PASS | `20260706000045_MoveLearningTablesToOwnedSchemas.cs` uses schema creation plus `RenameTable`/`RenameIndex`/constraint rebinding for active learning tables instead of dropping them. |
| Flashcard tables moved cleanly | PASS | Migration renames `flashcard_decks` -> `flashcards.decks` and `flashcard_cards` -> `flashcards.cards`. |
| Practice tables moved cleanly | PASS | Migration renames `practice_session_summaries` -> `practice.session_summaries` and `practice_settings` -> `practice.settings`. |
| Review tables moved cleanly | PASS | Migration renames `review_settings` -> `review.settings`, `word_review_states` -> `review.word_states`, and `word_review_histories` -> `review.word_histories`. |
| `card_reviews` status is resolved | PASS | `CardReview` and `ReviewRating` were removed from the active runtime model, while migration lineage already shows `card_reviews` dropped in `20260630055843_AddFluentAsrsReviewState`. |
| Dev/local posture and production caution are both explicit | PASS | This implementation supports the current pre-production dev phase, but the feature docs still require a preserve-data path before production release. |

## Commands Run

```text
dotnet ef migrations add MoveLearningTablesToOwnedSchemas --project src/backend/FluentA.Infrastructure --startup-project src/backend/FluentA.API --output-dir Persistence/Migrations
dotnet test src/backend/FluentA.Application.UnitTests/FluentA.Application.UnitTests.csproj
dotnet test src/backend/FluentA.Domain.UnitTests/FluentA.Domain.UnitTests.csproj
dotnet build src/backend/FluentA.API/FluentA.API.csproj --no-restore
dotnet ef migrations script --project src/backend/FluentA.Infrastructure --startup-project src/backend/FluentA.API
rg -n "card_reviews|CardReview|ReviewRating" src/backend -S
git diff --check
```

## Verification Results

| Check | Result |
| --- | --- |
| Application unit tests | PASS (103/103) |
| Domain unit tests | PASS (49/49) |
| API build | PASS |
| EF migration script generation | PASS |
| `git diff --check` | PASS with existing LF/CRLF warnings only |
| Build warnings | Existing `NU1903` warning for `Microsoft.OpenApi` remains; not introduced by this story |

## Constraints Preserved

- No public API route change.
- No frontend endpoint/client change.
- No Vocabulary sync ownership change.
- No non-learning schema move.
- No behavior change to Practice modes, Review random mode, dashboard math, or
  FluentA SRS scheduling.
