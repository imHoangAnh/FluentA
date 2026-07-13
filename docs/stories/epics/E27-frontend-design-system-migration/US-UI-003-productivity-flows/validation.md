# US-UI-003 Validation Record

Date: 2026-07-13

## Status

`IMPLEMENTED — ACCEPTANCE PROOF COMPLETE`

Todo, Habits, Countdowns, Kanban, and Pomodoro now run inside the shared
AppShell without duplicated productivity navigation. The locked CRUD,
calendar, ordering, timer, ownership, and realtime behaviors passed the
API-backed proof suite. No P1/P2 US-UI-003 finding remains.

## Approved Contract Reconciliation

The user selected the existing `US-TODO-002` week behavior as authoritative:
desktop Week view must reorder within a day and move tasks across visible days.
The prior title/note/completion-only update DTO could not persist that behavior,
so the user approved this bounded exception to the original presentation-only
plan:

- the existing authenticated Todo PATCH route accepts `date` and `sortOrder`;
- migration `20260713002415_AddTodoWeekMoveOrdering` adds durable ordering;
- the service resolves ownership first and normalizes affected source and
  destination ordering in one owner-scoped write;
- no API route, authorization rule, SignalR event, Redis timer contract, or
  broader architecture changed.

`docs/product/personal-productivity.md`, the story overview/exec plan, active
DTO/entity/repository/service code, migration, and tests now describe the same
contract.

## Acceptance Evidence

| Area | Implemented behavior | Durable proof |
| --- | --- | --- |
| AppShell | Todo, Habits, Countdowns, Kanban, Pomodoro and Habit Stats use shared protected navigation and active states | `personal-productivity-integration.spec.js`; legacy-shell source scan returned no matches |
| Todo | daily CRUD, completion ordering, seven-day planning, pointer reorder/cross-day move, explicit keyboard Move, owner isolation | `todo-daily-foundation.spec.js`, `todo-week-planning.spec.js`, 111 backend unit tests |
| Habits | CRUD, semantic icon selection, schedules, week/month eligibility, statistics, timezone behavior, realtime refresh | `habit-grid.spec.js`, `habit-stats.spec.js`, `habit-sync.spec.js` |
| Countdowns | empty/list/completed states, date-only create, repeatable alerts, optional cover, delete confirmation, accessible dialog | `countdown-events.spec.js`; dialog role, initial focus, Escape and focus-return assertions |
| Kanban | board/column/card CRUD, non-empty conflict, real priority/deadline filters, pointer drag, explicit Move select, ownership, realtime | `kanban-board.spec.js`, `kanban-sync.spec.js` |
| Pomodoro | task link, configuration, Idle/Running/Paused controls, reset/complete, cadence/history, daily count, stopwatch, realtime | four Pomodoro Playwright specs |
| Accessibility | labeled forms, visible state text, accessible errors, keyboard Move, dialog semantics, Escape and focus return | Countdown, Habit and Kanban browser assertions plus focused lint |
| Viewports | no page-level horizontal overflow at 1440x1000 or 1024x900 on all five routes; feature-local scrolling remains intentional | `productivity-responsive.spec.js` with ten deterministic Chromium screenshots |
| CSS boundary | duplicate shells and Dashboard CSS consumers removed; unnecessary productivity inline layout removed | source scan; only calculated Pomodoro SVG `strokeDashoffset` remains inline as approved |

Countdown and Pomodoro still load their active, route-scoped feature styles.
They are not duplicate shells or superseded styles; initiative-wide extraction
and legacy CSS deletion remains the explicit `US-UI-005` boundary.

## Commands And Results

### Passing

```text
npm.cmd run test:run
  9 test files passed; 36 tests passed

npm.cmd exec eslint -- <US-UI-003 routes and 14 E2E specs>
  passed with zero findings

dotnet test src/backend/FluentA.Application.UnitTests/FluentA.Application.UnitTests.csproj --no-restore
  111 passed; 0 failed; 0 skipped

dotnet build src/backend/FluentA.API/FluentA.API.csproj --no-restore
  succeeded; 0 errors; existing Microsoft.OpenApi 2.0.0 NU1903 warning

npx.cmd playwright test <14 US-UI-003 specs> --workers=1
  14 passed in 1.0m

npx.cmd playwright test e2e/countdown-events.spec.js e2e/kanban-board.spec.js e2e/productivity-responsive.spec.js --workers=1
  final post-cleanup check: 3 passed in 30.2s

git diff --check
  passed; line-ending conversion warnings only

rg 'dashboard-sidebar|dashboard-layout|LearningNavLinks|DashboardPage.css' <productivity routes>
  no matches
```

The 14-scenario browser run covers:

- Countdown CRUD;
- Habit grid, stats, and two-tab sync;
- Kanban CRUD/filter/move and two-tab sync;
- shared authenticated Todo cross-tab integration;
- Pomodoro complete, config, history/cadence, and two-tab sync;
- desktop/tablet overflow and screenshots;
- Todo daily CRUD/ownership and week reorder/cross-day move.

### Unrelated Repository Findings

These do not originate in a US-UI-003 route and were preserved rather than
silently changing another story's work:

- global frontend production build stops on unused `Search` and `Input`
  imports in `src/routes/dashboard/DashboardPage.tsx`;
- global lint reports those two Dashboard imports and the existing
  `react-hooks/set-state-in-effect` finding in `src/routes/notes/NotesPage.tsx`;
- API build reports the existing high-severity `Microsoft.OpenApi` 2.0.0
  `NU1903` advisory.

The full frontend unit suite, story-scoped lint, backend unit/build, browser
suite, responsive proof, and diff/source scans all pass despite those bounded
repository findings.

## Completion Review

- Product docs, story artifacts, source, migration, and tests agree.
- Numeric Harness proof flags are backed by commands above.
- No open P1/P2 productivity, realtime, accessibility, timer, or AppShell
  finding remains.
- The user supplied standing approval to complete all US-UI-003 work without
  additional approval prompts.

US-UI-003 is ready to be marked `implemented` in Harness.
