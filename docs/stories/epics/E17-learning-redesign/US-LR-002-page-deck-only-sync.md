# US-LR-002 Page-Deck-Only Sync

## Status

implemented

## Lane

high-risk

## Product Contract

Flashcard synchronization, reads, and route entry points use only page decks.
No All Words deck remains in the product model or returned APIs.

## Relevant Product Docs

- `docs/product/learning-workflows.md`
- `docs/stories/epics/E17-learning-redesign/context.md`

## Acceptance Criteria

- Creating or updating vocabulary creates and maintains one page deck per page.
- `GET /api/v1/flashcards/decks` returns only page decks.
- No frontend route, dashboard CTA, or API client depends on `AllWords`.
- Destructive migration removes superseded All Words deck data safely.

## Design Notes

- Commands: sync and read path updates.
- Queries: owned deck listing and owned deck session reads.
- API: existing flashcard deck reads return page-deck-only results.
- Tables: flashcard decks/cards migration and cleanup.
- Domain rules: page decks remain vocabulary-derived read models.
- UI surfaces: flashcard deck list and dashboard review entry assumptions.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | focused backend flashcard/vocabulary tests |
| Integration | migration application and owner-scoped deck query proof |
| E2E | deck list and dashboard regression smoke |
| Platform | backend build and frontend build |
| Release | included in US-LR-007 |

## Harness Delta

- Establishes the foundational migration story for the redesign.

## Evidence

- `dotnet test src/backend/FluentA.Domain.UnitTests/FluentA.Domain.UnitTests.csproj` passed with 45 tests after removing `AllWords` deck construction and deck-count assumptions.
- `dotnet test src/backend/FluentA.Application.UnitTests/FluentA.Application.UnitTests.csproj` passed with 87 tests after changing board creation to `AddBoardAsync`, page-deck-only notifier expectations, and page-deck-only active deck queries.
- `dotnet build src/backend/FluentA.API/FluentA.API.csproj --no-restore` passed after removing the dead due-deck API and restricting flashcard repository reads to page decks.
- `dotnet test src/backend/FluentA.slnx` passed with 132 backend tests.
- `dotnet ef database update --project src/backend/FluentA.Infrastructure/FluentA.Infrastructure.csproj --startup-project src/backend/FluentA.API/FluentA.API.csproj` applied `20260629102903_PurgeLegacyAllWordsDecks`, which deletes legacy `AllWords` decks plus dependent cards, reviews, and practice summaries.
- `npm --prefix src/frontend run test:run` passed with 19 tests after updating dashboard and flashcard expectations to the page-deck-only contract.
- `npm --prefix src/frontend run build` passed; the flashcard API client, dashboard CTA, flashcard page, practice page, and review page no longer depend on `AllWords`.
- Focused Playwright proof passed: `npm --prefix src/frontend run test:e2e -- flashcard-viewer.spec.js flashcard-practice.spec.js page-deck-active-recall.spec.js`.
