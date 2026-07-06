# Validation Report

## Status

READY WITH CONSTRAINTS - approval required before execution.

## Reality Gate

| Gate | Result | Evidence |
| --- | --- | --- |
| Mode fit | PASS | Feature 20 is a high-risk architecture cutover touching API, schema, backend boundaries, frontend clients, tests, and Vocabulary sync. |
| Repo fit | PASS | Static scans found the current mixed Flashcards controller/service/repository/domain/EF surface and frontend endpoint usage. |
| Assumptions | PASS WITH CONSTRAINTS | The story is map-only. Runtime refactor, endpoint removal, migrations, and frontend cutover stay out of scope until later stories. |
| Smaller path | PASS | `US-BC-001` is the smallest safe first story because it produces the contract map before code movement. |
| Proof surface | PASS | Repo files expose enough evidence to map endpoints, DTOs, service methods, repository methods, EF tables, frontend calls, and Vocabulary coupling. |

## Feasibility Matrix

| Part / Assumption | Risk | Proof | Result |
| --- | --- | --- | --- |
| Backend mixed surface is discoverable | HIGH | `FlashcardsController`, `IFlashcardService`, `FlashcardService`, `IFlashcardRepository`, `EfFlashcardRepository`, `AppDbContext`, and Flashcards domain entity files exist. | READY |
| Frontend cutover surface is discoverable | HIGH | `flashcard.api.ts`, `App.tsx`, route files, Vitest, and Playwright specs contain `/flashcards`, `/practice`, and `/review` route/API references. | READY |
| Vocabulary coupling is discoverable | HIGH | `VocabularyService`, `IVocabularyRepository`, and `EfVocabularyRepository` reveal direct Flashcard deck/card coupling. | READY |
| Migration posture can be planned without source edits | MEDIUM | `SPEC.md` Section 20 allows dev/local destructive reset while requiring a preserve-data path before production/user-data deployment. | READY WITH CONSTRAINTS |
| Story can remain runtime-neutral | MEDIUM | Story packet scopes execution to `contract-map.md` and static evidence only. | READY |

## Commands Run During Validation

```text
.\scripts\bin\harness-cli.exe query sql "select id, title, risk_lane, status, contract_doc, verify_command, notes from story where id = 'US-BC-001';"
rg -n "class FlashcardsController|interface IFlashcardService|class FlashcardService|interface IFlashcardRepository|class EfFlashcardRepository|DbSet<.*(Flashcard|Practice|Review|WordReview)|class VocabularyService|interface IVocabularyRepository|class EfVocabularyRepository" src/backend -S
rg -n "(/flashcards|/practice|/review|/api/v1/flashcards|/api/v1/practice|/api/v1/review)" src/frontend -S
git diff --check
```

## Constraints For Execution

- Execution must create `contract-map.md`; it must not move runtime source code.
- Execution must not change endpoint behavior, migrations, frontend behavior, or
  test expectations.
- The map must explicitly call out legacy endpoint remnants such as
  `/api/v1/flashcards/sessions` and `/api/v1/flashcards/review` where present
  in tests or controller compatibility routes.
- The map must assign later story ownership for every endpoint, entity, EF
  table/configuration, application/repository method, frontend call, and
  Vocabulary sync/cleanup dependency it inventories.

## Approval Gate

Approve execution for `US-BC-001` only. Approval means creating the
`contract-map.md` artifact and recording Harness evidence. It does not approve
source-code refactoring for `US-BC-002` or later stories.
