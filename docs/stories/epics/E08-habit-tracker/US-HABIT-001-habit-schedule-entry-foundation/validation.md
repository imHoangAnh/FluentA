# Validation

## Proof Strategy

Prove Habit schedule and toggle rules at the domain/application layer first,
then prove EF migration and API behavior against PostgreSQL. Finish with build
proof that the app remains healthy and Harness evidence is current.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | Name/description/color/icon validation; daily/custom schedule eligibility; custom unscheduled days do not qualify; future dates rejected; timezone validation required. |
| Integration | Owned create/list/patch/delete; foreign and deleted habit operations return 404; monthly entries query returns only owned entries; toggle creates and removes one entry. |
| E2E | API/PostgreSQL smoke creates a daily and custom habit, toggles eligible dates, rejects future and unscheduled dates, and proves foreign-user 404. Full browser grid E2E waits for `US-HABIT-002`. |
| Platform | EF migration applies to local PostgreSQL; API build has zero warnings/errors. |
| Performance | Habit list and toggle remain responsive under focused smoke data. |
| Logs/Audit | Existing request logs cover Habit API without habit descriptions or sensitive auth tokens. |

## Fixtures

- One isolated learner created through the registration flow or API helper.
- One foreign learner with a habit used for ownership proof.
- One daily habit.
- One custom habit with a deterministic weekday schedule.
- One past/today scheduled date, one future date, and one unscheduled custom
  date.
- Browser timezone fixture such as `UTC`.

## Commands

Expected after implementation:

```text
dotnet test src/backend/FluentA.slnx --no-restore
dotnet build src/backend/FluentA.API/FluentA.API.csproj --no-restore
dotnet ef database update --project src/backend/FluentA.Infrastructure --startup-project src/backend/FluentA.API
npm run test:run
npm run build
focused Habit API/PostgreSQL smoke command or script
```

## Acceptance Evidence

Implemented and validated on 2026-06-11:

- `dotnet test src/backend/FluentA.slnx --no-restore` passed 86 backend tests.
- `dotnet build src/backend/FluentA.API/FluentA.API.csproj --no-restore`
  passed with 0 warnings/errors.
- `dotnet ef database update --project src/backend/FluentA.Infrastructure --startup-project src/backend/FluentA.API`
  applied `AddHabitTrackerFoundation`.
- `npm run lint` passed.
- `npm run test:run` passed 21 frontend tests.
- `npm run build` passed with the existing third-party SignalR/Rolldown pure
  annotation warnings.
- Focused live API/PostgreSQL smoke passed:
  - created daily and custom habits for an authenticated user;
  - listed habits with `timeZoneId=UTC`;
  - toggled today's daily entry on and off;
  - rejected future date toggle with `422`;
  - rejected unscheduled custom date toggle with `422`;
  - rejected invalid timezone with `422`;
  - returned `404` for foreign-user patch;
  - returned `404` for toggling a deleted habit;
  - sent five concurrent toggle requests to one unchecked habit, all returned
    `200`, and the final monthly entry query returned one entry.
