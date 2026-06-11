# Validation

## Proof Strategy

Prove the existing backend contract preserves unrelated fields during
date/sort-order updates. Prove the desktop Week view and drag interactions with
frontend tests and focused Playwright.

## Test Plan

| Layer | Cases |
| --- | --- |
| Application | Patch date and sort order together while preserving title/note/completion. |
| Frontend | Protected Todo route renders Day mode; Week mode renders seven day columns from range data. |
| E2E | Create tasks, switch to Week, reorder within a day, move between days, navigate weeks, and verify persisted API order/date. |
| Platform | Frontend dependency install, lint, tests, and production build pass. |

## Commands

```text
dotnet test src/backend/FluentA.slnx --no-restore
dotnet build src/backend/FluentA.API/FluentA.API.csproj --no-restore
npm run lint
npm run test:run
npm run build
npx playwright test e2e/todo-week-planning.spec.js --workers=1
```

## Acceptance Evidence

| Requirement | Evidence |
| --- | --- |
| Monday-Sunday Week view and week navigation | `App.test.tsx` proves seven columns; focused Playwright switches to Week and navigates to the next week. |
| Desktop within-day reorder | Focused Playwright drags `Second Monday` before `First Monday` and polls the API until persisted order matches. |
| Desktop cross-day move | Focused Playwright drags `First Monday` to Tuesday and proves persisted date and target-column order. |
| Field-scoped preservation | `TodoServiceTests.Update_DateAndSortOrder_PreserveUnrelatedFields` and Playwright prove title/note/completion remain unchanged. |
| Platform health | Backend tests/build, frontend lint/tests/build, `git diff --check`, and focused Playwright pass. |

## Results

- Backend: 77 tests passed (30 domain, 47 application).
- Frontend: 21 tests passed.
- Focused E2E: 1 desktop Week planning test passed.
- API build: passed with 0 warnings and 0 errors.
- Frontend production build: passed; existing SignalR/Rolldown annotation warnings remain.
