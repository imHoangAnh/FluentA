# Validation

## Proof Strategy

Prove Todo domain rules and application ownership first, then prove the EF
migration and authenticated API against PostgreSQL. Finish with frontend route
tests and a focused Playwright scenario that exercises the daily Todo lifecycle
and on-access carry-over.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | Todo title/note validation, completion toggle, reschedule, soft-delete, first carry-over preserves original date, repeated carry-over is idempotent. |
| Integration | Owned create/list/patch/delete, foreign-user task returns 404, date query carries over only incomplete past tasks, completed tasks stay put, patch updates only supplied fields. |
| E2E | Register and verify learner, open Todo route, create today's task, toggle completion, delete task, create or seed a prior incomplete task, reopen Todo, see carried-over indicator. |
| Platform | EF migration applies to local PostgreSQL; API build has zero warnings/errors. |
| Performance | Day list and create/toggle/delete remain responsive under focused smoke data. |
| Logs/Audit | Existing request logs cover Todo API without task note content. |

## Fixtures

- One isolated learner created through the registration flow.
- One foreign learner with a task used for ownership proof.
- One incomplete task dated before today.
- One completed task dated before today.
- Today derived from the test runtime and serialized as `YYYY-MM-DD`.

## Commands

Expected after implementation:

```text
dotnet test src/backend/FluentA.slnx --no-restore
dotnet build src/backend/FluentA.API/FluentA.API.csproj --no-restore
dotnet ef database update --project src/backend/FluentA.Infrastructure --startup-project src/backend/FluentA.API
npm run lint
npm run test:run
npm run build
npx playwright test e2e/todo-daily-foundation.spec.js --workers=1
```

## Acceptance Evidence

Implemented and validated on 2026-06-11:

- `dotnet test src/backend/FluentA.slnx --no-restore` passed 67 backend tests.
- `dotnet build src/backend/FluentA.API/FluentA.API.csproj --no-restore` passed with 0 warnings/errors.
- `dotnet ef database update --project src/backend/FluentA.Infrastructure --startup-project src/backend/FluentA.API` reported the database already up to date after applying `AddTodoDailyFoundation`.
- `npm run lint` passed.
- `npm run test:run` passed 19 frontend tests.
- `npm run build` passed; Vite reported existing third-party SignalR/Rolldown pure annotation warnings from `node_modules/@microsoft/signalr`.
- `npx playwright test e2e/todo-daily-foundation.spec.js --workers=1` passed the focused desktop Todo CRUD, carry-over, and ownership smoke.
