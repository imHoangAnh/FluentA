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

## Follow-up Visual Polish — 2026-07-21

- Centered the completed-day check glyph independently from the circular SVG
  progress ring. Browser geometry assertions keep both the week-strip glyph and
  Habit-row glyph within one pixel of their container center.
- Kept the completed-row glyph white during hover/focus so it remains visible
  against the primary background.
- Reduced the Create/Edit Habit modal to a 440px maximum width with an 18px
  title, 13px labels, 14px fields, 12px form rhythm, smaller controls, and a
  760px bounded scroll area. All existing fields and keyboard behavior remain.
- Reduced the detail hierarchy to a 22px title/value scale, tighter statistic
  and goal cards, 13px description text, and a denser 16px calendar heading
  without changing colors, content order, or interaction targets.
- Focused Habit ESLint passed; Habit Vitest passed 4/4; authenticated Chromium
  `habit-grid.spec.js` and `habit-details.spec.js` passed 2/2 at desktop/tablet
  widths. Rendered modal and detail screenshots were visually inspected.
- Seven Habit fixtures and seven HabitEntry fixtures created by this follow-up's
  browser proof were deleted by their dedicated test-account prefixes. Existing
  non-fixture Habit rows and their entry were preserved.
- No P1 or P2 finding remains from this follow-up.

## Delete Confirmation Follow-up — 2026-07-21

- Replaced the Habit page's native `window.confirm` call with the shared Radix
  Alert Dialog used by the existing application design system.
- The modal names the selected Habit, explains that its check-in history is
  removed, and requires an explicit `Delete Habit` action. `Cancel`, Escape,
  focus trapping/restoration, destructive styling, pending-state locking, and
  an inline API error message are provided by the accessible dialog flow.
- Habit Vitest passed 5/5, focused Habit ESLint passed, and authenticated
  Chromium `habit-grid.spec.js` plus `habit-details.spec.js` passed 2/2. The E2E
  flow proves Cancel preserves the Habit and confirmation removes it.
- The rendered confirmation modal was visually inspected at 1440x900. Three
  browser fixtures and two fixture entries were removed by their test-account
  prefixes; existing non-fixture Habit rows were preserved.
- Active Habit source no longer contains `window.confirm`. No P1 or P2 finding
  remains from this follow-up.

## Split-Panel Border Follow-up — 2026-07-21

- Added 16px outer padding and spacing so the list and detail columns read as
  two separate panels without changing their approximately 50/50 ownership.
- The left Habit list now has a full design-token border, 12px rounded corners,
  and clipped header/list content so the corner treatment remains clean.
- The right selected-Habit detail now has the same 1px design-token outline and
  12px corner radius. Existing statistic, goal, description, and calendar card
  borders remain unchanged.
- Habit Vitest passed 4/4 and direct Vite production bundling passed. Live
  browser inspection at 1280px and 768px confirmed both outlines and radii,
  zero horizontal overflow, and no console warning/error.
- No API, component behavior, product contract, or data changed. No P1 or P2
  finding remains from this follow-up.

## Single-Row Statistics And Larger Description Follow-up — 2026-07-21

- Reduced the four detail statistic cards to a compact 48px row and kept all
  four cards on one line. Each card now places its short visible label on the
  left and its value on the right instead of stacking the value below.
- Preserved the full statistic meaning for assistive technology through the
  article accessible names: Total check-ins, Monthly check-in rate, Current
  streak, and Longest streak.
- Increased the Description card to a 120px minimum height with 15px body text
  and 1.6 line height. Existing newline preservation, long-token wrapping, and
  vertical scrolling for long descriptions remain intact.
- Habit Vitest passed 4/4, focused Habit ESLint passed, direct Vite production
  bundling passed, and authenticated Chromium `habit-grid.spec.js` plus
  `habit-details.spec.js` passed 2/2. The detail E2E explicitly verifies four
  statistic columns, horizontal card layout, the compact 17px values, larger
  15px description text, and overflow scrolling.
- Live browser inspection at 1516px confirmed the one-row layout, right-aligned
  values, readable non-truncated short labels, no horizontal document overflow,
  and no console warning/error. The temporary visual fixture was deleted.
- No API, database schema, stored data, or Habit behavior changed. No P1 or P2
  finding remains from this follow-up.

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
