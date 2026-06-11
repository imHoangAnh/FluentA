# Validation

## Proof Strategy

Prove entity validation and owner-scoped application behavior with unit tests,
then run the full backend solution, frontend checks, migration against local
PostgreSQL, and a focused browser/API smoke.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | Entity cleans/validates Unicode fields; service CRUD; foreign/deleted entries return not found. |
| Integration | Migration applies; authenticated API CRUD persists and isolates owners. |
| E2E | Learner creates, edits, lists, opens, and deletes a Unicode Journal entry. |
| Platform | Backend tests/build, frontend lint/tests/build, focused Playwright. |
| Performance | Newest-first list uses owner/created index and bounded previews. |
| Logs/Audit | Existing request logs cover Journal endpoints. |

## Fixtures

- Two verified learners.
- One Unicode journal entry with optional learning date.

## Commands

```text
dotnet test src/backend/FluentA.slnx
dotnet build src/backend/FluentA.slnx
npm --prefix src/frontend run lint
npm --prefix src/frontend run test:run
npm --prefix src/frontend run build
npx playwright test e2e/journal-foundation.spec.js
.\scripts\bin\harness-cli.exe story verify US-JOURNAL-001
```

## Acceptance Evidence

Passed on 2026-06-11:

- `dotnet test src/backend/FluentA.slnx` passed: 37 Domain tests and 58
  Application tests.
- `dotnet build src/backend/FluentA.slnx` passed with zero warnings/errors.
- `dotnet ef database update ...` applied
  `20260611153404_AddJournalEntryFoundation`; a later rerun confirmed the
  database is up to date.
- `npm --prefix src/frontend run lint` passed.
- `npm --prefix src/frontend run test:run` passed: 3 test files, 28 tests.
- `npm --prefix src/frontend run build` passed with the known third-party
  SignalR/Rolldown pure annotation warning.
- `npx playwright test e2e/journal-foundation.spec.js` passed: Unicode create,
  optional learning date, newest-first summary list, detail open/edit,
  soft-delete, deleted `404`, and foreign-user `404`.
- `.\scripts\bin\harness-cli.exe story verify US-JOURNAL-001` passed.
