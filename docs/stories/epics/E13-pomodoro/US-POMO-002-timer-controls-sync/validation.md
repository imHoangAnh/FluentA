# Validation

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | Start/pause/resume/reset/complete transitions; invalid transitions; notifier only after store mutation; running remaining calculation. |
| Integration | Redis state persists and reset deletes; API endpoints authenticated. |
| E2E | Two same-user tabs observe start, pause, resume, complete, and reset through SignalR. |
| Platform | Backend build, frontend lint/tests/build. |

## Commands

```text
dotnet test src/backend/FluentA.slnx
dotnet build src/backend/FluentA.slnx
npm --prefix src/frontend run lint
npm --prefix src/frontend run test:run
npm --prefix src/frontend run build
npx playwright test e2e/pomodoro-sync.spec.js --workers=1
```

## Acceptance Evidence

- `dotnet test src/backend/FluentA.slnx --no-restore --verbosity minimal`: passed, 42 Domain and 78 Application tests.
- `dotnet build src/backend/FluentA.slnx`: passed with 0 warnings and 0 errors.
- `npm --prefix src/frontend run lint`: passed.
- `npm --prefix src/frontend run test:run`: passed, 30 tests across 3 files.
- `npm --prefix src/frontend run build`: passed. Rolldown emitted known third-party SignalR pure-annotation warnings.
- `npx playwright test e2e/pomodoro-sync.spec.js --workers=1`: passed, proving start, pause, resume, phase completion, reset, and same-user two-tab synchronization.
