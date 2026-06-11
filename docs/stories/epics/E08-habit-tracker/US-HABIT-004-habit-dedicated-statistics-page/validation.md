# Validation

## Proof Strategy

Prove stats math in application tests first, including custom schedules where
unscheduled days do not break streaks or completion denominators. Then prove the
protected route renders backend-owned stats and finish with a focused browser
flow from Habit grid to stats page.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit/component | Stats route renders stat cards from cached/query data; back link returns to Habit grid. |
| Integration | Service computes current streak, longest streak, and 7/30-day rates for daily and custom habits; foreign/deleted habit returns `404`; invalid timezone returns validation error. |
| E2E | Authenticated browser creates a habit, toggles today's entry, opens stats page, and sees current/longest streak and rolling rate cards. |
| Platform | Backend tests, frontend lint, frontend tests, build, and focused Playwright stats spec pass. |
| Performance | Stats query reads bounded historical entries without introducing a schema change. |
| Logs/Audit | Existing request logs cover stats endpoint without adding habit text logging. |

## Fixtures

- One authenticated learner.
- One daily habit with a completed current-day entry for browser smoke.
- Deterministic application-test habits with historical entries for streak and
  rolling-rate proof.

## Commands

Expected after implementation:

```text
dotnet test src/backend/FluentA.Application.UnitTests/FluentA.Application.UnitTests.csproj
npm --prefix src/frontend run lint
npm --prefix src/frontend run test:run
npm --prefix src/frontend run build
npx playwright test e2e/habit-stats.spec.js
.\scripts\bin\harness-cli.exe story verify US-HABIT-004
```

## Acceptance Evidence

Implemented and partially validated on 2026-06-11:

- `dotnet test src/backend/FluentA.Application.UnitTests/FluentA.Application.UnitTests.csproj`
  passed 55 application tests, including deterministic daily/custom Habit stats
  coverage.
- `dotnet test src/backend/FluentA.slnx` passed 34 domain tests and 55
  application tests.
- `npm --prefix src/frontend run lint` passed.
- `npm --prefix src/frontend run test:run` passed 25 frontend tests.
- `npm --prefix src/frontend run build` passed with the existing third-party
  SignalR/Rolldown pure annotation warnings.
- `.\scripts\bin\harness-cli.exe story verify US-HABIT-004` passed via
  `npm --prefix src/frontend run test:run`.
- `docker compose -f docker-compose.dev.yml up -d` restored healthy local
  PostgreSQL and Redis containers.
- `dotnet ef database update --project src/backend/FluentA.Infrastructure/FluentA.Infrastructure.csproj --startup-project src/backend/FluentA.API/FluentA.API.csproj`
  confirmed the database was already up to date.
- `npx playwright test e2e/habit-stats.spec.js` passed:
  - registered and verified a new learner;
  - opened `/habits`;
  - created a daily habit;
  - toggled today's entry;
  - opened `/habits/{id}/stats`;
  - observed current streak, longest streak, and last 7/30-day scheduled-rate
    cards;
  - returned to the monthly grid;
  - observed no relevant application console errors.
