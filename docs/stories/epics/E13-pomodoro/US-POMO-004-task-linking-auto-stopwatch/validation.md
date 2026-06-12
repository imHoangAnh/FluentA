# Validation

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | Owned Todo/Kanban links accepted; missing/foreign link rejected; completed session keeps link. |
| E2E | Select task, start linked Work, complete; stopwatch start/pause/lap/reset. |
| Platform | Backend tests/build; frontend lint/tests/build. |

## Acceptance Evidence

- `dotnet test src/backend/FluentA.slnx`: passed, 44 Domain and 83 Application tests.
- `dotnet build src/backend/FluentA.slnx`: passed with 0 warnings and 0 errors.
- `npm --prefix src/frontend run lint`: passed.
- `npm --prefix src/frontend run test:run`: passed, 30 tests across 3 files.
- `npm --prefix src/frontend run build`: passed with known third-party SignalR/Rolldown warnings.
- `npx playwright test e2e/pomodoro-complete.spec.js --workers=1`: passed, proving owned Todo linking, linked Work completion, and stopwatch start/pause/lap/reset.
- Automatic completion is guarded to submit once per running phase and invokes
  browser sound plus Notification API behavior after successful completion.
