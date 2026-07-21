# Validation

## Readiness Status

`IMPLEMENTED AND REVIEWED` on 2026-07-22.

The approved D10-D11/D29/D45-D47 slice is executable using the current Todo
route family, EF/PostgreSQL repository, shared details panel, and test runtime.
Implementation stayed inside US-TODO-004: Reminder, Notification navigation,
Duplicate, and Week v2 remain in their registered follow-up stories. Review
found no P1 or P2 defect.

## Reality Gate

| Assumption | Risk | Evidence | Result |
| --- | --- | --- | --- |
| The fixed enum can be additive | ASP.NET enum defaults could expose numbers or broaden accepted values | current Todo DTOs use API-safe primitives; model configurations already persist enums with string conversion. Use nullable string request/response fields with explicit domain parsing and string EF conversion | Pass with C1 |
| One live generated child can be enforced while retaining soft-delete | an ordinary unique index would block regeneration after reopen | a rolled-back PostgreSQL temp-table probe rejected a second active child, then accepted a replacement after the first child received `deleted_at`; it reported one active child and two retained lineage rows | Pass with a filtered unique index |
| Completion and child mutation can be atomic | current repository methods each save immediately | current `EfHabitRepository.ToggleEntryAsync` proves the repo already uses PostgreSQL transactions and `SELECT ... FOR UPDATE`; Todo can add one focused lifecycle repository method without a new architectural layer | Pass with C2 |
| Edited versus unchanged can be reliable | timestamps or partial comparison can delete user work | the planned non-null pristine flag is explicit; a material direct PATCH to a generated child clears it, while system generation initializes it true | Pass |
| Calendar rules are deterministic | weekend/month-end/leap transitions are easy to implement incorrectly | .NET `DateTime.DaysInMonth` and calendar-day arithmetic are available; validation requires table tests for Friday/weekend, 28/29/30/31-day targets, leap and non-leap years | Pass with C3 |
| Current baseline can observe regressions | user-owned dirty files and package advisories can obscure global gates | Release Todo tests pass 8/8; EF reports no pending model changes and lists `AddTodoImportance` latest; focused Todo Vitest passes 9/9; PostgreSQL is healthy | Pass with C4 |
| The UI can add Repeat without new dependencies | a custom selector might break focus/keyboard behavior | Radix menu primitives are already installed and the details panel is a focused component with field-scoped `onUpdate` | Pass; add no dependency |

## Constraints On Implementation

- **C1 - Wire format:** use only `null`, `Daily`, `Weekdays`, `Weekly`,
  `Monthly`, or `Yearly`; reject every other non-null value with a field-level
  validation error. Do not enable a global enum JSON converter.
- **C2 - Atomicity and ownership:** lock the source by both id and authenticated
  owner inside the transaction. Source completion/reopen plus child create/
  soft-delete must commit together. The database unique index remains the
  retry/concurrency backstop.
- **C3 - Explicit pristine state:** only a material user-authored PATCH to the
  generated child clears pristine. Do not infer edits from audit timestamps and
  do not dirty a child merely because another task's reorder shifts it.
- **C4 - Honest platform proof:** preserve all unrelated dirty files. The known
  user-owned unused `RotateCw` import still blocks dirty-tree full lint/build;
  use scoped checks plus an exact staged-tree clean-worktree control before the
  story commit. Dependency advisory backlog #6 remains a final-release gate.
- **C5 - Story boundary:** no reminder fields/jobs, notification navigation,
  duplicate route, Week v2 layout, custom recurrence, series edit, or cascade.
- **C6 - Migration hygiene:** scaffold exactly one forward migration after
  `20260721173125_AddTodoImportance`; do not modify existing migrations.

## Baseline Evidence

| Check | Result |
| --- | --- |
| Release Todo application tests | Pass, 8/8 |
| EF pending-model check | Pass: no changes since `AddTodoImportance` |
| EF/live migration list | `InitialBaseline`, Habit migration, and `AddTodoImportance` present |
| PostgreSQL filtered-unique probe | Pass inside rolled-back transaction; duplicate active child rejected, replacement after soft-delete accepted |
| Focused Todo Vitest | Pass, 2 files and 9/9 tests |
| Runtime services | PostgreSQL and Redis healthy; MinIO running |

## Required Proof Matrix

| Layer | Required cases |
| --- | --- |
| Domain | exact enum set; Daily; Friday/weekend Weekdays; Weekly; month ends; leap/non-leap Yearly |
| Application | create/update/clear Repeat; invalid value; copied fields; idempotent complete; pristine reopen deletion; edited-child retain/warn; delete isolation; foreign owner |
| Persistence | migration SQL/defaults/self-lineage/filtered unique index; live concurrent/retried completion; live reopen branches; no pending model changes |
| Frontend | exact menu choices; optional clear state; save and reload; completion-generated occurrence; visible edited-child warning; no row metadata |
| Regression | existing My Day interactions and current Week planner remain green; scoped lint/build/tests; browser console/network clean |
| Hygiene | exact staged-file review, protected dirty hunks preserved, staged diff check, clean-worktree full frontend proof |

## Candidate Commands

```text
dotnet test src/backend/FluentA.Domain.UnitTests/FluentA.Domain.UnitTests.csproj --no-restore --configuration Release --filter Todo
dotnet test src/backend/FluentA.Application.UnitTests/FluentA.Application.UnitTests.csproj --no-restore --configuration Release --filter TodoServiceTests
dotnet build src/backend/FluentA.API/FluentA.API.csproj --no-restore --configuration Release
dotnet ef migrations has-pending-model-changes --project src/backend/FluentA.Infrastructure/FluentA.Infrastructure.csproj --startup-project src/backend/FluentA.API/FluentA.API.csproj --configuration Release --no-build
.\node_modules\.bin\vitest.cmd run src/features/todo
.\node_modules\.bin\eslint.cmd src/features/todo e2e/todo-daily-foundation.spec.js e2e/todo-week-planning.spec.js
.\node_modules\.bin\playwright.cmd test e2e/todo-daily-foundation.spec.js e2e/todo-week-planning.spec.js --workers=1
git diff --check
```

## Implementation Review - 2026-07-22

### Findings

- P1: none.
- P2: none.
- P3: none in this story scope.
- Existing platform warnings remain separately attributed: the user-owned
  `FlashcardViewerPage.tsx` still has an unused `RotateCw` import and trailing
  whitespace; backlog #6 tracks the pre-existing package advisories. Neither is
  edited or staged by this story.

### Acceptance Evidence

| Criterion | Evidence | Result |
| --- | --- | --- |
| Exact optional Repeat choices | DTO validation accepts only null or the five case-sensitive values; details-menu component and Chromium assertions show Does not repeat plus Daily, Weekdays, Weekly, Monthly, Yearly; explicit null clears the field | Pass |
| Calendar transitions | 10 table-driven domain cases cover daily, Friday/Saturday/Sunday Weekdays, weekly, 28/29/30/31-day monthly targets, and leap/non-leap yearly behavior | Pass |
| One copied next occurrence | Service tests and live Chromium/API proof show completion preserves the source and creates one incomplete child with new id plus copied title, note, importance, and Repeat | Pass |
| Retry and concurrency safety | six simultaneous authenticated PATCH requests against one live PostgreSQL source all returned 200 and the following date contained exactly one generated child | Pass |
| Pristine reopen | service and live browser proof show reopen soft-deletes the unchanged child in the same lifecycle mutation and a later completion can generate one replacement | Pass |
| Edited-child reopen | a direct child PATCH clears explicit pristine state; reopen retains the child and returns `recurrence-next-retained`; the UI shows the approved warning while keeping details open | Pass |
| Delete isolation | focused tests prove deleting the generated child preserves its source and deleting the source preserves its generated child | Pass |
| Ownership and compact-row boundary | lifecycle locking and child lookup include authenticated owner; existing foreign-owner 404 proof remains green; row assertion shows Repeat metadata stays out of the compact row | Pass |

### Migration And Runtime Proof

- Generated only `20260721182727_AddTodoRecurrence` after
  `AddTodoImportance`. It adds nullable `repeat_pattern`, nullable self-lineage
  `generated_from_todo_id`, and non-null pristine state defaulting false.
- The self-reference uses `ON DELETE SET NULL`, preserving the existing hard
  cleanup path, while the partial unique index applies only to non-deleted
  generated children.
- `dotnet ef database update` applied the migration to local PostgreSQL. Live
  schema inspection confirms all three columns and the filtered unique index.
- Live rows show the pristine child soft-deleted on the first reopen, the edited
  replacement retained with pristine false, and exactly one child produced by
  the six-request concurrency probe.
- `dotnet ef migrations has-pending-model-changes` reports no model drift.

### Verification Results

| Command/check | Result |
| --- | --- |
| Focused Todo repeat domain tests | Pass, 10/10 |
| Focused Todo application tests | Pass, 15/15 |
| Full backend solution tests | Pass sequentially, Domain 50/50 and Application 135/135 |
| Release API build | Pass, 0 errors; existing NU1902/NU1903 warnings only |
| Focused Todo Vitest | Pass, 2 files and 10/10 tests |
| Dirty-worktree full frontend Vitest | Pass sequentially, 23 files and 86/86 tests |
| Scoped Todo/E2E ESLint | Pass, 0 findings |
| Todo Chromium with real API/database | Pass, 5/5 for full My Day/Week suite; the recurrence case also passed after adding the six-request concurrency assertion |
| Exact staged-tree frontend controls | Pass in detached temporary worktree: full ESLint, production build, and 21 files with 82/82 tests; only non-failing SignalR annotation warnings during bundling |
| Dirty-worktree TypeScript build | Expected fail only at unrelated `FlashcardViewerPage.tsx:1` unused `RotateCw`; exact staged-tree production build passes |
| Staged diff check | Pass; whole dirty tree still reports only the unrelated Flashcard whitespace |

The first resource-contended parallel full-suite run timed out four unrelated
frontend tests at their exact five-second limit. Sequential reruns passed all
86 frontend tests and all 185 backend tests, so the timeouts are not used as
acceptance evidence.

### Reconciled Files And Boundaries

- Backend: Todo enum/schedule/entity, additive request/response fields,
  owner-scoped completion transaction, EF configuration/migration/snapshot,
  and focused domain/application tests. `PomodoroServiceTests` receives only the
  required fake-repository method for the additive Todo repository contract.
- Frontend: Todo API type, shared details Repeat menu, recurrence warning,
  focused component test, CSS, and Todo Chromium proof.
- Product: only Todo hunks in `docs/product/personal-productivity.md` are staged;
  the existing Countdown hunk remains unstaged.
- Excluded: all user-owned Habit, Countdown, Pomodoro, Flashcard,
  design-system, and non-Todo E2E changes, plus all US-TODO-005/006 behavior.
