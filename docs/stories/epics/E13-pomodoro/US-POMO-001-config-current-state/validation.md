# Validation

## Proof Strategy

The story is done when unit tests prove defaults and validation, integration
proof shows config persistence and current-state ownership behavior, frontend
checks pass, and a browser proof shows the `/pomodoro` page rendering current
state and saving config.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | Default config; valid updates; invalid duration ranges; idle current state derived from config. |
| Integration | Migration applies; authenticated API can get/update config and get current state; foreign-user leakage is impossible because endpoints use current user only. |
| E2E | Register/login, open Pomodoro, see idle 25:00 work state, update config, reload through app navigation, see updated persisted values. |
| Platform | Frontend lint, tests, and production build pass. |
| Performance | No benchmark; single config row and Redis lookup only. |
| Logs/Audit | Existing request logs only. |

## Commands

```text
dotnet test src/backend/FluentA.slnx
dotnet build src/backend/FluentA.slnx
dotnet ef database update --project src/backend/FluentA.Infrastructure --startup-project src/backend/FluentA.API
npm --prefix src/frontend run lint
npm --prefix src/frontend run test:run
npm --prefix src/frontend run build
npx playwright test e2e/pomodoro-config.spec.js --workers=1
```

## Acceptance Evidence

- `dotnet test src/backend/FluentA.slnx` passed on 2026-06-12:
  42 Domain tests and 75 Application tests.
- `dotnet build src/backend/FluentA.slnx` passed with 0 warnings and 0 errors.
- Migration `20260612032838_AddPomodoroConfigFoundation` applied successfully;
  a second `dotnet ef database update` confirmed the database is up to date.
- `npm --prefix src/frontend run lint` passed.
- `npm --prefix src/frontend run test:run` passed: 3 files and 30 tests.
- `npm --prefix src/frontend run build` passed with the existing third-party
  SignalR/Rolldown annotation warnings.
- `npx playwright test e2e/pomodoro-config.spec.js --workers=1` passed:
  authenticated user saw idle `25:00`, saved `30/7/20/3`, navigated away and
  back inside the SPA, and saw persisted config plus idle `30:00`.
- Browser/API proof exposed and verified a fix for parallel `/config` and
  `/current` default-config creation: the unique `user_id` winner is returned
  instead of surfacing a `500`.
