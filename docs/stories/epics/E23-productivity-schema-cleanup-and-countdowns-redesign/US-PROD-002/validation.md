# Validation

## Proof Strategy

Prove that Countdown now follows the Feature 22 contract exactly: date-based
targets, Vietnam-local alerts, optional cover asset linking, create/delete-only
workflow, and seven-day completed retirement.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | Countdown alert validation, duplicate rejection, past-alert rejection, completed ordering, retirement-window rules |
| Integration | migration/script review, owner-scoped create/list/delete, `scheduled_at_utc` persistence, cleanup and notification behavior |
| E2E | create with and without cover, multi-alert create, completed-state rendering, delete confirmation, no edit path, `/countdowns` route cutover |
| Platform | shared-asset upload/finalize smoke, static scans for legacy `/countdown` route references, `git diff --check` |
| Performance | not required for this story |
| Logs/Audit | Hangfire/job logs plus inbox rows reviewed for duplicate-free notification creation |

## Fixtures

- One authenticated learner with owned countdowns across upcoming/completed
  dates.
- Deterministic alert combinations covering `OnTargetDay`, `1DayBefore`,
  `3DaysBefore`, and `7DaysBefore`.
- One finalized owned shared asset suitable for `countdown-cover` linkage and
  one invalid/foreign asset for rejection proof.

## Commands

```text
dotnet test src/backend/FluentA.Domain.UnitTests/FluentA.Domain.UnitTests.csproj --filter "Countdown|Asset"
dotnet test src/backend/FluentA.Application.UnitTests/FluentA.Application.UnitTests.csproj --filter "Countdown|Asset"
dotnet build src/backend/FluentA.API/FluentA.API.csproj --no-restore
dotnet tool run dotnet-ef migrations script --project src/backend/FluentA.Infrastructure --startup-project src/backend/FluentA.API
npm --prefix src/frontend run lint
npm --prefix src/frontend run test:run -- Countdown
npm --prefix src/frontend run build
npm --prefix src/frontend run test:e2e -- productivity.spec.js
```

## Acceptance Evidence

Pending implementation.
