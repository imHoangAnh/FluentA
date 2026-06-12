# Validation

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | Stable recurring IDs and cron schedules are registered. |
| Integration | API starts Hangfire server with PostgreSQL storage. |
| Platform | Backend tests/build and live startup proof. |

## Acceptance Evidence

- `dotnet build src/backend/FluentA.slnx --no-restore`: passed with 0 warnings and 0 errors.
- `dotnet test src/backend/FluentA.slnx --no-build`: passed, 44 Domain and 83 Application tests.
- Hangfire PostgreSQL schema installed successfully with 12 Hangfire tables.
- Live API startup announced a Hangfire server and started all registered dispatchers.
- PostgreSQL recurring-job records proved:
  - `todo-carry-over`: `5 0 * * *`
  - `habit-reminders`: `0 20 * * *`
  - `countdown-alerts`: `*/5 * * * *`
  - `database-cleanup`: `0 2 * * 0`
- No Hangfire dashboard route is exposed.
