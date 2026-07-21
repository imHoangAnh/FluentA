# Validation

## Review Status

`IMPLEMENTED` and reviewed on 2026-07-21. No story-scoped P1 or P2 findings
remain. Domain, API, persistence, reminder, frontend, browser, product-document,
and Harness contracts agree with approved decisions D1-D19.

## Acceptance Evidence

| Approved behavior | Evidence | Result |
| --- | --- | --- |
| A seven-day strip selects one date, shows eligible-Habit aggregate progress, and every row has one independent selected-date check action. | HabitPage Vitest plus authenticated `habit-grid.spec.js` at desktop and tablet widths; Chrome and Edge cross-browser run. | Pass |
| Start Date gates eligibility, future-start Habits stay visible, and Start Date locks after the first check-in. | Domain/Application tests, live create/list/patch probe, and form/row browser assertions. A post-entry Start Date patch returned `422`. | Pass |
| Goal Days supports Forever, presets, and positive custom values; completion blocks new checks while an earlier uncheck reactivates the Habit. | Domain/Application tests, database positive constraint, live finite-goal API probe, and goal-panel browser proof. Explicit JSON `null` switched an existing finite goal to Forever. | Pass |
| Concurrent different-date checks cannot consume the same final goal slot. | Live PostgreSQL probe sent two concurrent checks against Goal Days 1. Responses were `200` and `422`; one HabitEntry persisted. | Pass |
| One optional minute-precision reminder uses fixed Vietnam time and delivers at most once per eligible Habit/date. | Live `00:00` persistence probe, minute job invocation, notification/durable-marker check, and a repeated invocation. First run queued one; the next queued zero and notification count stayed one. | Pass |
| Main detail has exactly Total check-ins, Monthly check-in rate, Current streak, and Longest streak; finite goal progress, description, and calendar follow the approved order. | HabitPage Vitest and `habit-details.spec.js`. Long multiline/unbroken description remained bounded, wrapped, and vertically scrollable. | Pass |
| Dedicated Stats UI/API route and action are removed. | Active-source stale-reference search, OpenAPI path inspection, route-manifest test, and live request. OpenAPI lists only `/habits`, `/habits/{habitId}`, and `/habits/{habitId}/entries`; Stats returned `404`. | Pass |
| Existing semantic icons, colors, frequency/custom days, edit/delete, realtime, and Dashboard behavior remain. | Existing tokens/icons reused; full frontend Vitest, focused ESLint, `habit-sync.spec.js`, and `dashboard-overview.spec.js`. | Pass |
| The approved reset affects only HabitEntry/Habit rows. | Generated migration review and live application. The forward migration executes `DELETE FROM habit_entries` then `DELETE FROM habits`; no unrelated table operation exists. | Pass |

## Automated Commands And Results

```powershell
dotnet test src/backend/FluentA.slnx --no-restore
```

- Domain: 40/40 passed.
- Application: 128/128 passed.

```powershell
dotnet build src/backend/FluentA.API/FluentA.API.csproj --no-restore -p:UseAppHost=false
```

- Succeeded with 0 errors.
- Reported existing dependency advisories for AngleSharp 0.17.1 and
  Microsoft.OpenApi 2.0.0, plus an apphost cleanup warning because the proven
  API process was intentionally still running on port 5000.

```powershell
npm --prefix src/frontend run test:run
npx eslint src/features/habits src/features/dashboard/pages/DashboardPage.tsx e2e/habit-grid.spec.js e2e/habit-details.spec.js e2e/habit-sync.spec.js e2e/dashboard-overview.spec.js
```

- Frontend: 19 test files and 72/72 tests passed.
- Story-scoped Habit/Dashboard/E2E ESLint passed.

```powershell
npm --prefix src/frontend run test:e2e -- habit-grid.spec.js habit-details.spec.js habit-sync.spec.js dashboard-overview.spec.js
npx playwright test --config=playwright.habit-cross-browser.config.js
```

- Final authenticated Chromium run: 4/4 passed.
- Habit-specific Chrome/Edge desktop/tablet run: 4/4 passed.

```powershell
dotnet tool run dotnet-ef migrations has-pending-model-changes --project src/backend/FluentA.Infrastructure --startup-project src/backend/FluentA.API --no-build
git diff --check -- <story source and documentation paths>
```

- EF reported no model changes after the generated migration.
- Story-scoped diff check passed; only line-ending conversion notices were
  printed.

## Migration And Runtime Proof

- Before the migration, live PostgreSQL contained 1 Habit and 0 HabitEntry
  rows. The approved migration reset them and applied
  `20260720231334_AddHabitGoalsRemindersAndSelectedDay` after the baseline.
- Live schema inspection confirms:
  - `start_date`: required PostgreSQL `date`.
  - `goal_days`: nullable integer with
    `ck_habits_goal_days_positive` (`NULL OR > 0`).
  - `reminder_time`: required `time without time zone`, no database default, so
    midnight `00:00` is persisted rather than treated as an EF sentinel.
  - `ix_habits_reminder_due` covers reminder enabled/time/last-sent filtering.
- Live create/list/toggle/update proof preserved Start Date, Goal Days, and
  `07:30`; the Goal Days 1 check returned total 1 and completed state.
- Hangfire stores `habit-reminders` with cron `* * * * *`; its live run proved
  fixed Vietnam-date due filtering and once-per-day delivery.
- Browser and runtime fixtures were removed after proof. The final live counts
  are 0 Habits and 0 HabitEntries. The cleanup removed only 14 Habits and 13
  HabitEntries created by this review's automated browser runs.

## Route And File Reconciliation

- Removed `HabitStatsPage`, its frontend route, client function/type, controller
  endpoint, application interface/service operation, and superseded E2E spec.
- Active code contains no Stats page, Stats API method, or Stats route reference.
  The remaining `.habit-stats-grid` name is the local CSS class for the approved
  four-card main-panel layout; the remaining `/stats` E2E string is the negative
  route-retirement assertion. Planning/product documentation mentions the old
  route only to record its removal.
- Added selected-day week/list/detail/form components and their unit/browser
  coverage. Updated `docs/product/personal-productivity.md` and decision 0046.
- Preserved the user's unrelated dirty Flashcard and Todo files without editing
  or reverting them.

## Known Warnings Outside This Story

- Full frontend lint and build still stop only on the two pre-existing unused
  symbols in the user's unrelated dirty files:
  `FlashcardViewerPage.tsx` (`RotateCw`) and `TodoPage.tsx` (`formatDay`). Story
  scoped lint and all frontend tests pass.
- Read-only dependency audit reports one existing high-severity Axios advisory;
  the backend build reports existing AngleSharp moderate and Microsoft.OpenApi
  high advisories. Dependency upgrades are outside the approved Habit redesign
  and were not changed silently.
- No commit or push was requested or performed.
