# Validation

## Proof Strategy

Prove durable owner-scoped work completion, deterministic break selection,
daily count boundaries, migration health, and visible count refresh.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | Session entity; work persistence; short/long break interval; break completion; daily window. |
| Integration | Migration applies; completed sessions persist; owner counts isolated. |
| E2E | Configure interval, complete work phases, observe count and long break. |
| Platform | Backend tests/build; frontend lint/tests/build. |

## Commands

```text
dotnet test src/backend/FluentA.slnx
dotnet build src/backend/FluentA.slnx
npm --prefix src/frontend run lint
npm --prefix src/frontend run test:run
npm --prefix src/frontend run build
npx playwright test e2e/pomodoro-history.spec.js --workers=1
```

## Acceptance Evidence

- `dotnet test src/backend/FluentA.slnx`: passed, 44 Domain and 81 Application tests.
- `dotnet build src/backend/FluentA.slnx`: passed with 0 warnings and 0 errors.
- Migration `20260612043420_AddPomodoroSessions` applied successfully.
- `npm --prefix src/frontend run lint`: passed.
- `npm --prefix src/frontend run test:run`: passed, 30 tests across 3 files.
- `npm --prefix src/frontend run build`: passed with known third-party SignalR/Rolldown warnings.
- `npx playwright test e2e/pomodoro-history.spec.js --workers=1`: passed, proving daily count updates and configured long-break scheduling.
