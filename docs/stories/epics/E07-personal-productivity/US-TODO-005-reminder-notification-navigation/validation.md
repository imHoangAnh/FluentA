# Validation

## Readiness Status

`IMPLEMENTED AND REVIEWED` on 2026-07-22.

The approved D8-D9/D27-D28/D44/D48/D51-D52 slice is executable through the
current Todo aggregate, owner-scoped service/repository, API-hosted Hangfire
runtime, durable Notification table, React Query client, and shared details
panel. Week v2 and Duplicate remain in `US-TODO-006`.

## Reality Gate

| Assumption | Risk | Evidence | Result |
| --- | --- | --- | --- |
| API is the executable job host | stale Worker evidence could produce changes in a nonexistent runtime | source contains only a Worker launch profile; `FluentA.API` calls `RecurringJobRegistration.Register`, and Infrastructure adds `AddHangfireServer` | Pass; use API-hosted scanner |
| IANA timezone round-trip is portable | Windows and Linux timezone mappings could disagree | the same .NET 10 probe on Windows and `mcr.microsoft.com/dotnet/sdk:10.0-alpine` resolved `America/New_York`; normal, invalid, and both ambiguous instants matched | Pass with C1 |
| Notification can support safe navigation additively | stored paths could become an open redirect | current projection has no action; add one validated relative path and repeat validation in the client | Pass with C2 |
| Retry can be idempotent | concurrent scanners could insert twice | PostgreSQL is healthy; Notification already has a live unique `(user_id, deduplication_key)` index; add claimed-row locking and same-save sent marker | Pass with C3 |
| Owned deep-link read can reuse Todo boundaries | list-only lookup cannot select a task outside My Day | repository already has owner/deleted-scoped `GetAsync`; expose it through the service/controller with the current nondisclosing not-found error | Pass |
| Baseline can observe regression | dirty user changes can obscure global proof | Todo application tests pass 15/15, Todo Vitest passes 10/10, EF reports no pending model changes, and PostgreSQL/Redis are healthy | Pass with C4 |

## Constraints On Implementation

- **C1 - Exact schedule tuple:** accept only a valid `HH:mm`, resolvable IANA
  timezone, UTC-kind instant that converts back to the task date and time, and
  a future instant. Do not silently repair a user-submitted invalid tuple.
- **C2 - Stored navigation boundary:** `actionPath` is optional and only a
  same-origin application-relative path. Server and client both reject
  absolute, protocol-relative, backslash, control-character, or external paths.
- **C3 - Atomic delivery:** claim due rows with `FOR UPDATE SKIP LOCKED`; add or
  recover the deduped Notification and mark sent in one transaction/save. Do
  not create a Hangfire job per reminder.
- **C4 - Dirty-worktree hygiene:** preserve all unrelated Habit, Countdown,
  Pomodoro, Flashcard, design-system, and E2E changes. Stage only exact Todo/
  Notification/story hunks; use a staged-tree clean-worktree control before
  commit because the user-owned Flashcard import blocks dirty-tree build.
- **C5 - Lifecycle:** moving recomputes the saved reminder and clears/warns
  only when the result is past; completion cancels unsent source delivery;
  recurrence copies time/timezone and derives a new instant.
- **C6 - DST mutation policy:** server-derived ambiguous times use the earlier
  UTC occurrence; nonexistent times shift forward by the transition gap. The
  original browser-selected ambiguous instant is always preserved at save.
- **C7 - Migration/story boundary:** scaffold exactly one forward migration
  after `20260721182727_AddTodoRecurrence`; no Duplicate route or Week v2 UI.

## Baseline Evidence

| Check | Result |
| --- | --- |
| Release Todo application tests | Pass, 15/15 |
| Focused Todo Vitest | Pass, 2 files and 10/10 tests |
| EF pending-model check | Pass: no changes since `AddTodoRecurrence` |
| Live schema | Todo recurrence columns/index present; Notification dedupe index unique |
| Windows/Linux timezone probe | Matching normal, invalid, and ambiguous results on .NET 10 |
| Runtime services | PostgreSQL and Redis healthy; MinIO running |

## Required Proof Matrix

| Layer | Required cases |
| --- | --- |
| Domain | save/clear/sent state; normal/invalid/ambiguous IANA schedule behavior; safe/unsafe action paths |
| Application | optional create/update/clear; exact tuple/past validation; date recompute and clear/warn; completion cancel; recurrence copy; by-id owner/deleted not-found |
| Persistence/job | one migration; due partial index; stable minute registration; claimed batch; two-run/concurrent dedupe; no pending model changes |
| Frontend | optional time-only control; reload; clear; past/invalid feedback; read-and-navigate; deep-linked non-today task; safe not-found |
| Regression | My Day, existing Week, Repeat, Habit and Countdown notification projection; scoped lint/build/tests; clean browser console/network |
| Hygiene | exact staged review, protected dirty hunks preserved, staged diff check, staged-tree clean-worktree proof |

## Candidate Commands

```text
dotnet test src/backend/FluentA.Domain.UnitTests/FluentA.Domain.UnitTests.csproj --no-restore --configuration Release --filter "Todo|Notification"
dotnet test src/backend/FluentA.Application.UnitTests/FluentA.Application.UnitTests.csproj --no-restore --configuration Release --filter TodoServiceTests
dotnet build src/backend/FluentA.API/FluentA.API.csproj --no-restore --configuration Release
dotnet ef migrations has-pending-model-changes --project src/backend/FluentA.Infrastructure/FluentA.Infrastructure.csproj --startup-project src/backend/FluentA.API/FluentA.API.csproj --configuration Release --no-build
.\node_modules\.bin\vitest.cmd run src/features/todo src/features/notifications
.\node_modules\.bin\eslint.cmd src/features/todo src/features/notifications e2e/todo-daily-foundation.spec.js e2e/todo-week-planning.spec.js
.\node_modules\.bin\playwright.cmd test e2e/todo-daily-foundation.spec.js e2e/todo-week-planning.spec.js --workers=1
git diff --check
```

## Implementation Review - 2026-07-22

### Findings

- P1: none.
- P2: none.
- P3: none in this story scope.
- Existing platform findings remain separately attributed: NU1902/NU1903
  dependency advisories and the user-owned Flashcard `RotateCw`/whitespace
  changes are not caused or staged by this story.

### Acceptance Evidence

| Criterion | Evidence | Result |
| --- | --- | --- |
| One optional exact reminder | create/update/read/clear tests and live API round trip preserve `HH:mm`, `Asia/Ho_Chi_Minh`, and the exact UTC instant; explicit null clears | Pass |
| Timezone and DST contract | Windows and .NET 10 Alpine probes matched normal, invalid, and both ambiguous `America/New_York` cases; domain tests select the earlier overlap instant and shift a gap forward | Pass |
| Past and lifecycle behavior | application tests reject past/mismatched/non-UTC tuples, recompute a future move, clear/warn a past move, cancel completion, and copy time/timezone to a recurring child | Pass |
| Owner-scoped deep link | live owner GET succeeds and foreign GET returns the same 404; deleted and foreign service tests share `TODO_NOT_FOUND`; Todo opens a requested non-My-Day item from the by-id query | Pass |
| Idempotent delivery | a live PostgreSQL reminder was forced due, `ProcessTodoRemindersAsync` ran twice, and one Notification plus one sent marker remained | Pass |
| Stable job registration | live Hangfire state contains `todo-reminders`, cron `* * * * *`, and the `IScheduledProductivityJobs.ProcessTodoRemindersAsync` target | Pass |
| Safe notification navigation | server domain and client helper reject absolute, protocol-relative, backslash, and control-character paths; Chromium marked the live notification read and opened `/todo?taskId={id}` details | Pass |
| Existing Todo compatibility | live Chromium My Day, responsive details, manual reorder, Repeat lifecycle, and current Week regression all remain green | Pass |

### Migration And Runtime Proof

- Generated and applied only
  `20260721190548_AddTodoReminderNotificationNavigation` after
  `AddTodoRecurrence`.
- Live PostgreSQL contains the four nullable Todo reminder columns, nullable
  Notification `action_path`, and the filtered due-reminder index.
- EF reports no pending model changes after migration.
- The due-row scanner uses a bounded `FOR UPDATE SKIP LOCKED` batch. Existing
  dedupe recovery and the unique `(user_id, deduplication_key)` index protect
  retries; Notification insertion and `reminder_sent_at_utc` share one save and
  transaction.
- The API process is the verified job host. Backend runtime documentation no
  longer presents the non-buildable `FluentA.Worker` folder as an active host.

### Verification Results

| Command/check | Result |
| --- | --- |
| Focused Todo/Notification domain tests | Pass, 16/16 |
| Focused Todo application tests | Pass, 25/25 |
| Full backend tests | Pass sequentially, Domain 55/55 and Application 146/146 |
| Release API build | Pass, 0 errors; existing NU1902/NU1903 warnings only |
| Focused Todo/Notification Vitest | Pass, 5 files and 22/22 tests |
| Dirty-worktree full frontend Vitest | Pass sequentially, 26 files and 98/98 tests |
| Scoped Todo/Notification/E2E ESLint | Pass, 0 findings |
| Exact staged-tree clean-worktree controls | Pass: backend Domain 55/55, Application 146/146, API build; full frontend ESLint, production build, and 24 files with 94/94 tests |
| Live US-TODO-005 Chromium | Pass, 2/2: minute-scanner delivery/read/navigation and move/recurrence/foreign lifecycle |
| Live existing Todo Chromium regression | Pass, 5/5: My Day, responsive details, manual sort, Repeat, and current Week |
| EF migration/model check | Migration applied; no pending model changes |
| Scoped diff check | Pass; whole dirty tree remains separately affected by the user-owned Flashcard whitespace |

The first Chromium attempt used the proof Vite origin `127.0.0.1:5182`, while
the existing API CORS contract permits `127.0.0.1:5173`. Both tests correctly
stopped at registration and created no Todo rows. The proof was rerun on the
permitted IPv4 origin without changing CORS; lifecycle passed in 9.6 seconds,
delivery/navigation passed in 1.3 minutes, and both proof processes were then
stopped without touching the user's API/Vite processes.
