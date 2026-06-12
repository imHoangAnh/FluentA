# Validation

## Proof Strategy

Prove month validation, owner/deleted filtering, active-date counts, empty-date
draft preparation, populated-date opening, and no regressions in Journal search.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | Month validation; grouped calendar days; foreign/deleted entries excluded. |
| Integration | API calendar returns only owned active learning dates. |
| E2E | Calendar indicator appears; populated date opens entry; empty date prepares new unsaved entry; month navigation works. |
| Platform | Backend tests/build, frontend lint/tests/build, focused Playwright. |
| Performance | Calendar uses bounded month range and existing `(user_id, learning_date)` index. |
| Logs/Audit | Existing request logs cover calendar endpoint. |

## Fixtures

- Two verified learners.
- Owned, foreign, deleted, and no-date Journal entries.

## Commands

```text
dotnet test src/backend/FluentA.slnx
dotnet build src/backend/FluentA.slnx
npm --prefix src/frontend run lint
npm --prefix src/frontend run test:run
npm --prefix src/frontend run build
npx playwright test e2e/journal-calendar.spec.js
.\scripts\bin\harness-cli.exe story verify US-JOURNAL-004
```

## Acceptance Evidence

Passed on 2026-06-12:

- Backend solution passed 37 Domain and 62 Application tests.
- Backend solution build passed with zero warnings and zero errors.
- Frontend lint, 28 Vitest tests, and production build passed with the known
  third-party SignalR/Rolldown annotation warning.
- Focused Playwright passed calendar API owner/deleted/no-date filtering,
  invalid-month `422`, visible day indicators/counts, populated-date opening of
  the newest entry, empty-date unsaved entry preparation, explicit creation, and
  indicator refresh.
- Journal search Playwright regression passed after calendar changes.
- Visual inspection confirmed the calendar grid, selected date, entry list, and
  editor remain usable in the desktop Journal layout.

