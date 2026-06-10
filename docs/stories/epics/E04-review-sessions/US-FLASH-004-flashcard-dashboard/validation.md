# Validation

## Proof Strategy

Prove dashboard calculations through service tests and a browser flow that creates a real review, then observes updated dashboard stats.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | Timezone validation, owned board scope, not-found behavior. |
| Integration | Backend solution tests compile service/repository contracts. |
| E2E | Create card, observe dashboard new count/forecast, complete review, observe streak and retention. |
| Platform | Full Playwright suite against local API/Vite. |

## Fixtures

Playwright creates an isolated user, board, page, word, and one review.

## Commands

```text
dotnet test src/backend/FluentA.slnx --no-restore
dotnet build src/backend/FluentA.API/FluentA.API.csproj --no-restore
npm run lint
npm run test:run
npm run build
npx playwright test e2e/flashcard-dashboard.spec.js --workers=1
npx playwright test --workers=1
```

## Acceptance Evidence

- `dotnet test src/backend/FluentA.slnx --no-restore`: passed, 44 tests.
- `dotnet build src/backend/FluentA.API/FluentA.API.csproj --no-restore`: passed after stopping the temporary API process, 0 warnings/errors.
- `npm run lint`: passed.
- `npm run test:run`: passed, 18 frontend tests.
- `npm run build`: passed; only known third-party SignalR pure-annotation warnings from Rolldown.
- `npx playwright test e2e/flashcard-dashboard.spec.js --workers=1`: passed.
- `npx playwright test --workers=1`: passed, 9 E2E scenarios.
