# US-LR-007 Learning Redesign Release Proof

## Status

implemented

## Lane

high-risk

## Product Contract

Release proof must show the redesign removed All Words leakage, preserved
speech/text interaction quality, and kept the new Flashcard, Practice, and
Review contracts coherent across frontend, backend, and migration behavior.

## Relevant Product Docs

- `docs/product/learning-workflows.md`
- `docs/stories/epics/E17-learning-redesign/epic-map.md`

## Acceptance Criteria

- No All Words deck is returned or required anywhere in the shipped learning
  flows.
- Flashcard viewer, Practice workflow, and Review workflow all pass focused E2E
  proof.
- Practice and Review reuse Feature 13 dictation, meaning-to-word, and
  pronunciation interactions without regression.
- Migration, dashboard fallout, and ownership behavior are explicitly verified.

## Design Notes

- Commands: release ladder only.
- Queries: matrix and verification output.
- API: n/a.
- Tables: release proof includes migration behavior.
- Domain rules: no acceptance claim without focused regression evidence.
- UI surfaces: Flashcard, Practice, Review, dashboard, settings.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | full affected backend/frontend suites |
| Integration | migration and ownership regression proof |
| E2E | flashcard-viewer, practice-workflow, review-workflow specs |
| Platform | production build, browser speech fallback, matrix verification |
| Release | full Feature 14 ladder plus `git diff --check` |

## Harness Delta

- Reserves the final proof row for the redesign release audit.

## Evidence

- Final redesign proof passed:
  - `dotnet test src/backend/FluentA.slnx`
  - `dotnet build src/backend/FluentA.API/FluentA.API.csproj --no-restore`
  - `npm --prefix src/frontend run lint`
  - `npm --prefix src/frontend run test:run`
  - `npm --prefix src/frontend run build`
  - `npm --prefix src/frontend run test:e2e -- learning-navigation.spec.js flashcard-viewer.spec.js practice-workflow.spec.js review-workflow.spec.js`
  - `.\scripts\bin\harness-cli.exe query matrix`
  - `git diff --check`
- The local database was updated through `20260629102903_PurgeLegacyAllWordsDecks`, so stored legacy `AllWords` decks are now removed instead of merely ignored by new code.
- Dedicated-review-state proof also passed:
  - `dotnet test src/backend/FluentA.Application.UnitTests/FluentA.Application.UnitTests.csproj --filter FlashcardServiceTests`
  - `dotnet test src/backend/FluentA.Domain.UnitTests/FluentA.Domain.UnitTests.csproj --filter VocabularyTests`
  - `dotnet tool run dotnet-ef database update --project src/backend/FluentA.Infrastructure --startup-project src/backend/FluentA.API`
  - `npm --prefix src/frontend run test:e2e -- review-workflow.spec.js`
- Flashcard viewer proof also passed:
  - `npm --prefix src/frontend run test:e2e -- flashcard-viewer.spec.js`
- Practice proof also passed:
  - `npm --prefix src/frontend run test:e2e -- practice-workflow.spec.js`
- Navigation split proof also passed:
  - `npm --prefix src/frontend run test:e2e -- learning-navigation.spec.js`
- The redesign now fully replaces the old shipped All Words learning model with
  dedicated Flashcard, Practice, and board-scoped Review workflows.
