# Validation

## Proof Strategy

Prove Countdown domain rules and application ownership first, then prove the EF
migration and authenticated API against PostgreSQL. Finish with frontend route
tests and a focused Playwright scenario that exercises the Countdown lifecycle,
completed-state rendering, and foreign-user isolation.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | Countdown name/color/icon validation, UTC target normalization, update behavior, completed-state calculation, soft-delete. |
| Integration | Owned create/list/patch/delete, sorting by target date, foreign-user event returns 404, invalid target/color/name returns 422. |
| E2E | Register and verify learner, open Countdown route, create future event, edit it, see live remaining text, delete with confirmation, seed past event and see completed state. |
| Platform | EF migration applies to local PostgreSQL; API build has zero warnings/errors. |
| Performance | List/create/update/delete remain responsive under focused smoke data. |

## Fixtures

- One isolated learner created through the registration flow.
- One foreign learner with a countdown used for ownership proof.
- One future countdown event.
- One past countdown event for completed-state rendering.

## Commands

Expected after implementation:

```text
dotnet test src/backend/FluentA.slnx --no-restore
dotnet build src/backend/FluentA.API/FluentA.API.csproj --no-restore
dotnet ef database update --project src/backend/FluentA.Infrastructure --startup-project src/backend/FluentA.API
npm run lint
npm run test:run
npm run build
npx playwright test e2e/countdown-events.spec.js --workers=1
```

## Acceptance Evidence

Implemented and validated on 2026-06-11:

- `dotnet test src/backend/FluentA.slnx --no-restore` passed 76 backend tests.
- `dotnet build src/backend/FluentA.API/FluentA.API.csproj --no-restore` passed with 0 warnings/errors.
- `dotnet ef database update --project src/backend/FluentA.Infrastructure --startup-project src/backend/FluentA.API` reported the database already up to date after applying `AddCountdownEvents`.
- `npm run lint` passed.
- `npm run test:run` passed 20 frontend tests.
- `npm run build` passed; Vite reported existing third-party SignalR/Rolldown pure annotation warnings from `node_modules/@microsoft/signalr`.
- `npx playwright test e2e/countdown-events.spec.js --workers=1` passed the focused desktop Countdown create/edit/delete/completed-state/ownership smoke.
