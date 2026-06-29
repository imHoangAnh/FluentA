# US-LR-003 Dedicated Review State

## Status

implemented

## Lane

high-risk

## Product Contract

SRS state is stored in a dedicated review table linked to `VocabWord`, created
after Practice completion, and deleted with the owning vocabulary content.

## Relevant Product Docs

- `docs/product/learning-workflows.md`
- `docs/decisions/0034-learning-workflow-redesign-boundary.md`

## Acceptance Criteria

- Review-state rows are linked to vocabulary ownership, not flashcard-card
  ownership.
- First Practice completion creates `Learning` review state due tomorrow.
- Re-practice resets an existing record to `Learning`, due tomorrow.
- Word, page, and board deletion hard-delete related review-state rows.

## Design Notes

- Commands: create/reset review state and answer persistence.
- Queries: board-scoped due queue reads.
- API: supports downstream Practice completion and Review answer flows.
- Tables: dedicated review-state table plus migration from old storage.
- Domain rules: correct = Good, wrong = Again for MVP.
- UI surfaces: Practice completion and Review queue behavior depend on this.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | focused SRS mapping and lifecycle tests |
| Integration | migration, ownership, and deletion proof |
| E2E | downstream Practice and Review flows |
| Platform | migration apply + API build |
| Release | included in US-LR-007 |

## Harness Delta

- Introduces the new SRS ownership boundary for Feature 14.

## Evidence

- `dotnet test src/backend/FluentA.Application.UnitTests/FluentA.Application.UnitTests.csproj --filter FlashcardServiceTests`
  passed with timezone validation plus dedicated review-state practice-summary
  coverage.
- `dotnet test src/backend/FluentA.Domain.UnitTests/FluentA.Domain.UnitTests.csproj --filter VocabularyTests`
  passed with `WordReviewState` lifecycle coverage.
- `dotnet build src/backend/FluentA.API/FluentA.API.csproj --no-restore`
  passed after the dedicated review-state repository refactor.
- `dotnet tool run dotnet-ef database update --project src/backend/FluentA.Infrastructure --startup-project src/backend/FluentA.API`
  applied migration `20260629105959_AddWordReviewStates`.
- `npm --prefix src/frontend run test:e2e -- flashcard-practice.spec.js page-deck-active-recall.spec.js all-words-sm2.spec.js`
  passed, proving practice-created review state, immediate review-state
  progression, and no dependence on `All Words` decks.
