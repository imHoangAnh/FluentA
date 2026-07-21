# Validation

## Readiness Status

`IMPLEMENTED AND REVIEWED` on 2026-07-22.

The dependency gate passes: `US-TODO-005` is implemented/reviewed with all four
Harness proof flags and local commit `ba89919`. The current Todo service already
owns all durable fields required by Duplicate, and the shared details panel is
complete. This story can change Week presentation and add one command without a
schema or architecture change.

## Reality Gate

| Assumption | Risk | Evidence | Result |
| --- | --- | --- | --- |
| Duplicate can remain server-owned and additive | compact rows omit hidden fields | repository `GetAsync` is owner/deleted scoped; Todo entity now holds note, importance, Repeat, and Reminder; current create path produces a new incomplete identity | Pass with C1 |
| Week can reuse shared details | two panels could diverge | `TodoPage` already derives one selected task and mounts `TodoDetailsPanel`; Week currently lacks only selection wiring | Pass |
| Existing Week behavior is observable | presentation replacement could silently lose reorder/move | live Chromium Week regression passed after US005 and current component exposes native drag plus explicit select-based Move | Pass with C2 |
| Seven columns can remain readable | a 4:1 details split can compress controls | current page/container support local overflow; equal `minmax` columns plus wrapping titles can keep the page fixed while the board scrolls locally | Pass with C3 |
| No migration is needed | final story might accidentally drift the model | EF reports no pending changes after the live US005 migration; Duplicate adds no persistent field | Pass with C4 |
| Dirty tree can be preserved | shared product doc and frontend contain active user work | US005 proved exact hunk staging and staged-tree worktree controls; reuse that boundary for Week files and Todo-only product hunks | Pass with C5 |

## Constraints On Implementation

- **C1 - Duplicate ownership:** only `POST /api/v1/todos/{id}/duplicate` may
  duplicate. It reads the owned source, copies all approved fields, assigns a
  new id/same date/next order, resets completion and reminder delivery state,
  and returns 404 for missing/deleted/foreign ids.
- **C2 - Interaction preservation:** desktop drag, within-day reorder,
  cross-day move, previous/next week, completion, and confirmed delete remain.
  Move must be available by Shift+F10/right-click without a visible control.
- **C3 - Visual boundary:** headers show weekday text only; each column owns Add
  task; rows show only completion/title/icon-star; titles wrap; details use an
  approximate 4:1 split; narrow overflow stays inside the board.
- **C4 - No schema:** do not create an EF migration. Final proof must still show
  `has-pending-model-changes` is clean and the prior reminder migration applied.
- **C5 - Hygiene:** preserve all unrelated Countdown, Habit, Pomodoro,
  Flashcard, design-system, story, and E2E changes. Partially stage the shared
  product doc and run exact staged-tree full controls before commit.
- **C6 - Story boundary:** no mobile drag, alternative week start, visible row
  menu, custom recurrence, or reminder/repeat/note/date text in Week rows.

## Baseline Evidence

| Check | Result |
| --- | --- |
| Dependency/Harness | US-TODO-005 implemented with unit/integration/e2e/platform flags |
| Current live Week Chromium | Pass after US005: reorder and cross-day move with note preservation |
| Current full backend | Pass, Domain 55/55 and Application 146/146 |
| Current full frontend | Pass dirty tree 98/98; exact US005 staged tree 94/94 with lint/build |
| EF migration state | `AddTodoReminderNotificationNavigation` applied; no pending model changes |
| Runtime services | PostgreSQL and Redis healthy; MinIO running |

## Required Proof Matrix

| Layer | Required cases |
| --- | --- |
| Application/API | duplicate all approved fields; new id; same date; next order; incomplete; foreign/deleted 404; source unchanged |
| Frontend unit | range labels; seven weekday-only columns; per-day optional quick add; title selection; icon star; context Duplicate/Move/Delete; details open/close |
| Live behavior | per-day create does not auto-open; duplicate survives reload with hidden fields; drag reorder; cross-day move; completion; importance; delete |
| Layout | details closed/open at desktop, equal columns, wrapped long title, approximately 4:1 split, local narrow scroll, no page overflow, screenshots |
| Release regression | My Day, Repeat, Reminder delivery/navigation, Notification safety, current Week semantics, full backend/frontend, build/lint, EF no drift |
| Hygiene | exact staged files/hunks, protected dirty changes preserved, staged diff check, staged-tree clean-worktree controls, local commit only |

## Candidate Commands

```text
dotnet test src/backend/FluentA.Application.UnitTests/FluentA.Application.UnitTests.csproj --no-restore --configuration Release --filter TodoServiceTests
dotnet build src/backend/FluentA.API/FluentA.API.csproj --no-restore --configuration Release
dotnet ef migrations has-pending-model-changes --project src/backend/FluentA.Infrastructure/FluentA.Infrastructure.csproj --startup-project src/backend/FluentA.API/FluentA.API.csproj --configuration Release --no-build
.\node_modules\.bin\vitest.cmd run src/features/todo src/features/notifications
.\node_modules\.bin\eslint.cmd src/features/todo src/features/notifications e2e/todo-week-planning.spec.js
.\node_modules\.bin\playwright.cmd test e2e/todo-week-planning.spec.js --workers=1
git diff --check
```

## Implementation Review - 2026-07-22

### Findings

- P1: none.
- P2: none.
- P3: none in the US-TODO-006 scope.
- Existing platform findings remain separately attributed: the tracked NuGet
  and npm dependency advisories and unrelated dirty Countdown, Habit,
  Pomodoro, Flashcard, Notes, and design-system work are not staged here.

### Acceptance Evidence

| Criterion | Evidence | Result |
| --- | --- | --- |
| Week entry and header | Chromium entered Week from the My Day `...` menu, navigated next week, and matched `Week` plus the formatted Monday-Sunday range; date helpers cover same-month, cross-month, and cross-year labels | Pass |
| Seven day-owned creation paths | DOM and unit tests found exactly seven weekday-only headings and seven title-only Add task inputs; live Enter creation used Monday's exact date and did not open details | Pass |
| Compact independent row | Each row exposes only completion, selectable wrapping title, and icon-only importance; unit/Chromium proved title selection, star, completion, and absence of note/Repeat/Reminder text | Pass |
| Server-owned Duplicate | focused service tests copy title, note, importance, Repeat, Reminder, same date, next order, new id, and incomplete state while missing/deleted/foreign sources return nondisclosing not-found; live API duplication survived reload with all hidden fields | Pass |
| Accessible lifecycle | native drag reordered within Monday and moved across days; Shift+F10 opened Move and persisted Wednesday; right-click Duplicate/Delete, confirmation, importance, and completion all persisted | Pass |
| Shared details | title selection mounts the existing details panel; live note/Repeat/Reminder state matched the selected task; closing the panel restored full board width | Pass |
| Layout and overflow | all seven columns differed by at most 1 px; the desktop board/panel ratio remained between 3.8 and 4.2; the pathological long title wrapped; 1440 and 1024 screenshots were visually inspected; page overflow was 0 while narrow overflow stayed inside the board | Pass |
| Schema boundary | no migration was created; EF reports no pending model changes after the prior reminder migration | Pass |

### Verification Results

| Command/check | Result |
| --- | --- |
| Focused Todo application tests | Pass, 27/27 |
| Focused Todo frontend tests | Pass, 4 files and 20/20 tests |
| Full backend staged-tree controls | Pass, Domain 55/55 and Application 148/148 |
| Release API build | Pass, 0 errors; existing NU1902/NU1903 warnings only |
| Exact staged frontend lint/build | Pass; production build completed with existing SignalR annotation warnings only |
| Exact staged full frontend tests | Pass, 25 files and 100/100 tests |
| Live Week v2 Chromium | Pass, 1 comprehensive test covering create/select/duplicate/drag/move/star/complete/delete and 1440/1024 geometry |
| EF model drift | Pass, no pending model changes |
| Scoped/staged diff check | Pass; only Todo product hunks are staged from the shared product document |

The first dirty-tree full frontend run was intentionally non-authoritative: it
ran concurrently with backend controls and included active user changes. It
reported 99 passing tests plus five unrelated Countdown/Notes/Vocabulary
failures, mostly five-second timeouts. The isolated exact-index worktree then
passed lint, production build, and all 100 staged-tree tests, proving the Todo
slice without modifying or masking those user-owned files.

### Runtime And Hygiene Notes

- The live proof used isolated `127.0.0.1:5106` API and IPv4
  `127.0.0.1:5173` Vite processes because the repository CORS contract permits
  that origin. Both proof processes were stopped afterward; the user's API on
  port 5000 and IPv6 Vite on port 5173 remained running.
- The disposable exact-index worktree was validated, used for full controls,
  and removed. No push was performed.
