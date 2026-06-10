# Validation

## Proof Strategy

Prove settings rules and local-day boundaries independently, then prove the
owned PostgreSQL due query applies global distinct-card allowances and stable
priority ordering. Finally prove the browser settings and Spaced flow without
regressing existing modes.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | settings defaults/ranges, invalid timezone, local-day bounds, remaining allowance calculations |
| Integration | settings ownership, global cross-deck distinct-card counts, repeated reviews, due priority, foreign/Page Deck rejection |
| E2E | configure limits, start Spaced session, see prioritized limited cards, complete summary, preserve Normal/Shuffle |
| Platform | EF migration application and direct PostgreSQL query proof |
| Performance | due query and settings API remain responsive for seeded data |
| Logs/Audit | settings/due requests use canonical logs without sensitive content |

## Fixtures

- One learner with two boards and two All Words decks.
- Overdue, due-today, new, future, and repeatedly reviewed cards.
- A Page Deck card and a foreign user's deck.
- `Asia/Ho_Chi_Minh` and `America/New_York` timezone cases.

## Commands

```text
dotnet test src/backend/FluentA.slnx --no-restore
dotnet build src/backend/FluentA.API/FluentA.API.csproj --no-restore
dotnet ef database update --project src/backend/FluentA.Infrastructure --startup-project src/backend/FluentA.API
npm run lint
npm run test:run
npm run build
npm run test:e2e
```

## Acceptance Evidence

- `dotnet test src/backend/FluentA.slnx`: passed 37 tests (16 domain, 21
  application).
- `dotnet build src/backend/FluentA.API/FluentA.API.csproj`: passed with zero
  warnings and zero errors.
- `dotnet ef database update`: applied
  `20260610021152_AddReviewSettings` to local PostgreSQL.
- `npm run lint`, `npm run test:run`, and `npm run build`: passed; 6 frontend
  tests passed. Build emitted only known third-party SignalR annotation
  warnings.
- `npm run test:e2e`: passed all 5 Playwright scenarios.
- Focused Spaced proof saved limits of 1 new and 1 review card, returned one of
  two new cards, completed the review, then returned empty same-day Spaced
  queues from both a second board and the original board.
- Existing Normal/Shuffle SM-2, Page Deck Active Recall, vocabulary CRUD, and
  SignalR viewer scenarios remained green. Live synchronization timings were
  133 ms create, 95 ms update, and 88 ms delete.
