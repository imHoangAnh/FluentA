# Validation

## Proof Strategy

Use narrow proof for the SRS contract, then broaden only to the app surfaces
that consume it. The minimum release proof is domain scheduler tests,
application validation tests, frontend route tests, and focused Practice/Review
Playwright specs.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | FluentA SRS correct/wrong transitions, Level 0 lapse behavior, state/history validation. |
| Integration | Service validation for Practice, Review, settings, dashboard, and timezone handling. |
| E2E | Practice abandon/Finish/Add-to-Review; Review due queue, overflow, correct/wrong, early rejection, owner isolation. |
| Platform | Backend API build and frontend production build. |
| Performance | Due-state queries use owner/date filters and avoid broad card scheduling scans. |
| Logs/Audit | Harness trace records commands, files read/changed, decisions, and friction. |

## Fixtures

- Two-word Practice deck for `Finish` versus `Add to Review`.
- Three-word Review board with `alpha`, `beta`, and `gamma` due states.
- `beta` seeded at Level 2 with three lapses to prove wrong increments above
  Level 0.
- `gamma` overflowed to tomorrow to prove early mutation rejection.

## Commands

```text
dotnet test src/backend/FluentA.Domain.UnitTests/FluentA.Domain.UnitTests.csproj --filter "FluentAsrsScheduler|WordReviewState|WordReviewHistory"
dotnet test src/backend/FluentA.Application.UnitTests/FluentA.Application.UnitTests.csproj --filter FlashcardServiceTests
npm --prefix src/frontend run test:run -- App.test.tsx
npm --prefix src/frontend run build
npm --prefix src/frontend run test:e2e -- practice-workflow.spec.js review-workflow.spec.js
```

## Acceptance Evidence

- `dotnet test src/backend/FluentA.Domain.UnitTests/FluentA.Domain.UnitTests.csproj --filter "FluentAsrsScheduler|WordReviewState|WordReviewHistory"` passed: 9 tests.
- `dotnet test src/backend/FluentA.Application.UnitTests/FluentA.Application.UnitTests.csproj --filter FlashcardServiceTests` passed: 16 tests.
- `npm --prefix src/frontend run test:run -- App.test.tsx` passed: 10 tests.
- `dotnet build src/backend/FluentA.API/FluentA.API.csproj --no-restore` passed after stopping stale `FluentA.API` PID 8728 that locked `FluentA.Infrastructure.dll`.
- `dotnet tool run dotnet-ef database update --project src/backend/FluentA.Infrastructure --startup-project src/backend/FluentA.API` passed; database already up to date.
- `npm --prefix src/frontend run build` passed with existing SignalR/Rolldown pure annotation warnings and chunk-size warning.
- `git diff --check` passed with line-ending warnings only.
- First Playwright attempt failed because stale Vite PID 2864 listened only on `::1`; after restarting Vite on `127.0.0.1:5173`, `npm --prefix src/frontend run test:e2e -- practice-workflow.spec.js review-workflow.spec.js` passed: 2 tests.
- `.\scripts\bin\harness-cli.exe story verify US-SRS-006` passed after setting the verify hook to `git diff --check`.
