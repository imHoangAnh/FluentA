# Validation

## Proof Strategy

Prove the story is ready by checking that the current EF model still uses the
default schema, the target schema mapping is explicit in Feature 20, migration
artifacts are present and reviewable, and the repo can support a dev/local
schema move without mixing in route/frontend work.

## Reality Gate

| Gate | Result | Evidence |
| --- | --- | --- |
| Mode fit | PASS | This is a high-risk schema-ownership and migration story. |
| Repo fit | PASS | EF configurations, model snapshot, and migration history are present in the infrastructure project. |
| Assumptions | PASS WITH CONSTRAINTS | Route/frontend/Vocabulary cutovers remain deferred to later approved stories. |
| Smaller path | PASS | Schema ownership is the smallest next move after repository split and before API/frontend cutover. |
| Proof surface | PASS | Config files, snapshot, migrations, backend tests, API build, and EF migration script generation provide enough evidence. |

## Feasibility Matrix

| Part / Assumption | Risk | Proof Required | Evidence | Result |
| --- | --- | --- | --- | --- |
| Learning tables are still in the default schema | HIGH | Current `ToTable` mappings and snapshot must show legacy ownership. | Current configurations call `ToTable(\"flashcard_decks\")`, `ToTable(\"practice_settings\")`, `ToTable(\"review_settings\")`, and related legacy names without target schemas. | READY |
| Target schema mapping is already approved | HIGH | Feature docs must name exact target schemas/tables. | `SPEC.md` Section 20 and `contract-map.md` assign `flashcards`, `practice`, and `review` schema ownership. | READY |
| Migration artifacts are reviewable in-repo | HIGH | EF migration files and snapshot exist under infrastructure persistence. | `src/backend/FluentA.Infrastructure/Persistence/Migrations/*` and `AppDbContextModelSnapshot.cs` exist. | READY |
| Dev/local destructive reset posture is acceptable for current implementation | HIGH | Approved docs must allow dev reset while preserving production caution. | Feature 20 locked posture allows destructive reset in dev/local because the app is pre-production. | READY WITH CONSTRAINTS |
| `card_reviews` can be resolved without scope bleed | HIGH | Usage scan must show whether it is runtime-active or only migration lineage. | Runtime domain type still exists under `Review`, while migration history still contains old `card_reviews` entries. | READY WITH CONSTRAINTS |
| Non-learning tables can stay untouched | MEDIUM | Schema move can be scoped to Flashcard/Practice/Review tables only. | Current target list in Feature 20 names only learning tables. | READY |

## Test Plan

| Layer | Cases |
| --- | --- |
| Static scan | Current `ToTable` mappings and snapshot ownership versus target schema plan. |
| Backend unit/build | Existing backend tests and API build still pass after schema mapping changes. |
| EF proof | Migration generation or migration script review proves schema/table moves and preserves indexes/FKs/filters. |
| Snapshot review | `AppDbContextModelSnapshot.cs` reflects the intended schemas. |
| E2E | Not required; public routes and frontend behavior stay unchanged in this story. |

## Commands

```text
rg -n "ToTable\\(|flashcard_decks|flashcard_cards|practice_settings|practice_session_summaries|review_settings|word_review_states|word_review_histories|card_reviews" src/backend/FluentA.Infrastructure/Persistence/Configurations src/backend/FluentA.Infrastructure/Persistence/Migrations/AppDbContextModelSnapshot.cs -S
rg -n "card_reviews|CardReview" src/backend -S
dotnet test src/backend/FluentA.Application.UnitTests/FluentA.Application.UnitTests.csproj
dotnet test src/backend/FluentA.Domain.UnitTests/FluentA.Domain.UnitTests.csproj
dotnet build src/backend/FluentA.API/FluentA.API.csproj --no-restore
dotnet tool run dotnet-ef migrations script --project src/backend/FluentA.Infrastructure --startup-project src/backend/FluentA.API
.\scripts\bin\harness-cli.exe story verify US-BC-004
git diff --check
```

## Acceptance Evidence

To complete this story, record:

- learning tables map to `flashcards`, `practice`, and `review` schemas
- model snapshot matches the intended schema ownership
- indexes, unique constraints, filters, and FKs remain intact
- `card_reviews` status is explicitly resolved and documented
- dev/local reset posture and production preserve-data requirement are both
  stated clearly
- backend proof passes or unrelated failures are documented
