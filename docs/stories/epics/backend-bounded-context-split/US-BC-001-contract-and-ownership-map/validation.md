# Validation

## Proof Strategy

Validate that the story can produce a complete current-to-target map without
changing runtime behavior. Evidence must come from current repo inspection and
static scans, not from assumptions.

## Reality Gate

| Gate | Result | Evidence |
| --- | --- | --- |
| Mode fit | PASS | Feature 20 changes API contracts, schema ownership, backend boundaries, and frontend cutover. |
| Repo fit | PASS | Current mixed Flashcards backend and frontend endpoint call sites exist in the repo. |
| Assumptions | PASS WITH CONSTRAINTS | No code split starts until the map resolves endpoint names, migration posture, and Vocabulary sync strategy. |
| Smaller path | PASS | The smaller first story is a map-only story; runtime refactor is deferred. |
| Proof surface | PASS | Static inspection can cover backend files, frontend endpoint strings, EF mappings, and Vocabulary coupling. |

## Feasibility Matrix

| Part / Assumption | Risk | Proof Required | Evidence | Result |
| --- | --- | --- | --- | --- |
| Existing mixed backend can be inventoried | HIGH | Controller/service/repository/domain/EF files are present and searchable. | `FlashcardsController`, `FlashcardService`, `IFlashcardRepository`, `EfFlashcardRepository`, `AppDbContext`, and Flashcards domain entity files exist. | READY |
| Frontend cutover scope can be inventoried | HIGH | API client and tests contain endpoint strings to map. | `flashcard.api.ts` and Playwright specs include `/flashcards`, `/practice`, and `/review` endpoint references. | READY |
| Vocabulary coupling can be mapped before implementation | HIGH | Vocabulary files reveal direct Flashcard coupling. | `VocabularyService`, `IVocabularyRepository`, and `EfVocabularyRepository` import/use Flashcard deck/card types and tables. | READY |
| Migration posture can stay map-only in this story | MEDIUM | Feature 20 decisions allow dev/local destructive reset while requiring production preserve-data planning. | `SPEC.md` Section 20.6 and locked decisions define the migration posture. | READY WITH CONSTRAINTS |
| Runtime behavior can remain unchanged | MEDIUM | Story scope excludes source moves and migrations. | `execplan.md` out-of-scope section gates runtime edits. | READY |

## Test Plan

| Layer | Cases |
| --- | --- |
| Static scan | Endpoint strings, controller actions, service/repository methods, domain entities, EF mappings, frontend call sites, Vocabulary coupling. |
| Docs proof | `contract-map.md` includes all required sections and later-story assignment. |
| Harness | `US-BC-001` story row is registered; trace links the validation outcome. |
| Build/test | Not required for this story because no runtime source code changes are made. Later implementation stories must run backend/frontend verification ladders. |

## Commands

```text
rg -n "Route\\(|Http(Get|Post|Put|Delete)|/api/v1|flashcards|practice|review" src/backend src/frontend -S
rg -n "Flashcard|Practice|Review|WordReview|FluentAsrs|Vocabulary" src/backend/FluentA.* -S
rg -n "ToTable\\(|DbSet<|HasIndex|HasForeignKey" src/backend/FluentA.Infrastructure -S
.\scripts\bin\harness-cli.exe query matrix
.\scripts\bin\harness-cli.exe story verify US-BC-001
git diff --check
```

## Acceptance Evidence

To complete this story, record:

- `contract-map.md` exists and contains every required map section.
- Each current endpoint has a target context, target endpoint family, and later
  story assignment.
- Each current domain/application/repository/EF surface has a target owner.
- Each frontend API/test endpoint reference has a target replacement or removal
  note.
- Vocabulary sync/cleanup coupling has an explicit split strategy and risk
  note.
- Migration posture is explicit for dev/local and production/user-data.
- Static scans and Harness verification are recorded in the story evidence.
