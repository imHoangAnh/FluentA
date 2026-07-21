# Validation

## Readiness Status

`IMPLEMENTED AND REVIEWED` on 2026-07-22.

The human approved the D1-D58 delivery plan and this first story was implemented
without pulling Repeat, Reminder/Notification, Duplicate, or Week v2 behavior
forward. Focused review found no P1 or P2 defect. The exact staged tree passed
the clean lint, production build, unit, API build, and model-alignment controls
required by C4.

## Reality Gate

| Assumption | Risk | Evidence | Result |
| --- | --- | --- | --- |
| One additive importance field fits the current migration chain | a non-null column could conflict with existing rows or the pending Habit migration | EF reports no pending model changes after `20260720231334_AddHabitGoalsRemindersAndSelectedDay`; live PostgreSQL has both current migrations; a transaction-scoped temp-table probe added `boolean NOT NULL DEFAULT FALSE` and read an existing row as `false`, then rolled back | Pass |
| The existing API can remain additive and owner-scoped | a new field could weaken field-scoped updates or expose foreign tasks | `[Authorize]` controller resolves the current user; repository `GetAsync` filters `Id`, `UserId`, and `DeletedAt`; 7 focused `TodoServiceTests` pass, including supplied-field preservation and foreign-owner not-found | Pass |
| Existing UI primitives can implement the approved interactions | a new dependency or custom inaccessible menu/dialog could be required | local Radix context-menu and alert-dialog wrappers exist; Radix dropdown-menu and `@dnd-kit` are already locked dependencies | Pass; add no dependency |
| Automatic-sort drag can become durable manual order | one PATCH may reorder against the old manual sequence rather than the rendered automatic order | the existing PATCH accepts one target `sortOrder` and normalizes the full destination day; sequentially moving each incomplete item in rendered order yields the final rendered order without a batch API | Pass with sequential awaited persistence and failure rollback proof |
| The user-owned Todo diff can be preserved | a page rewrite could silently restore the removed hero/date picker | the only current Todo diff removes the `TODO LIST` hero and selected-date card; My Day explicitly removes arbitrary Day date selection, so implementation preserves that semantic removal and removes the now-unused `formatDay` helper | Pass with scoped diff review |
| Product documentation can be updated without taking Countdown edits | the shared product file is already dirty | current diff changes only the Countdown section; Todo changes must be a separate exact hunk and smart-commit must stage only the Todo hunk | Pass with hunk staging |
| Focused browser proof can observe the target state | old E2E selectors may fail for reasons unrelated to runtime health | API is live on `127.0.0.1:5000`; PostgreSQL/Redis/MinIO are healthy; an IPv4 Vite helper reached the UI. Both current Todo specs then failed exactly on removed `TODO LIST`/selected-date selectors | Pass after replacing obsolete assertions with D1-D43/D53 behavior and retaining Week regression through current-week/navigation setup |
| Current platform baseline is otherwise healthy | unrelated dirty changes or package advisories could make full gates ambiguous | backend build passes with two advisory warnings; frontend 76/76 tests pass; full lint/build also report the Todo unused helper plus an unrelated dirty Flashcard `RotateCw` import; dependency scans report pre-existing high advisories | Pass with constraints C4-C6 below |

## Constraints On Implementation

- **C1 - Story boundary:** `US-TODO-003` adds only durable importance and the My
  Day core. It does not add reminder, recurrence, duplicate, by-id deep link,
  notification, or scheduled-job behavior.
- **C2 - No new dependency:** use the installed Radix and dnd-kit packages plus
  existing shared primitives.
- **C3 - Preserve user intent:** do not restore the removed hero/date selector.
  Preserve all unrelated dirty files and the Countdown hunk in the shared
  product contract.
- **C4 - Honest platform proof:** the current full frontend lint/build is also
  blocked by the user-owned unused `RotateCw` import in
  `FlashcardViewerPage.tsx`. Do not edit or stage that unrelated file. After the
  Todo commit, run full frontend proof in a temporary clean worktree at that
  commit, while also recording the dirty-worktree failure separately.
- **C5 - Browser runtime:** start a bounded Vite process explicitly on
  `127.0.0.1:5173` for Todo E2E because the user's current server binds only
  IPv6 localhost. Stop only the helper process after proof.
- **C6 - Existing dependency advisories:** `axios 1.17.0` reports high runtime
  advisories; the API graph reports transitive `Microsoft.OpenApi 2.0.0` high
  and `AngleSharp 0.17.1` moderate advisories. Backlog #6 tracks a separately
  approved dependency update. They predate this story, but must be resolved or
  explicitly accepted before final `US-TODO-006` release closeout.
- **C7 - Migration hygiene:** scaffold one forward migration after the current
  Habit migration; do not edit, rename, or regenerate existing migrations.

## Validation Questions

1. Can the current migration chain accept a non-null `is_important` default
   without rewriting or conflicting with the user's pending Habit migration?
2. Does the current PATCH/repository path preserve all unrelated fields when
   importance, title, note, completion, date, or sort order changes alone?
3. Can the current Week regression run unchanged after the navigation control
   moves into the page-level menu?
4. Which existing design-system primitives satisfy the menu, confirmation,
   panel, focus, tooltip, and responsive boundaries without adding another UI
   dependency?
5. Can manual drag persist the rendered order after clearing an automatic sort
   without transient cache reorder or duplicate PATCH races?
6. Which dirty hunks in `TodoPage.tsx` and the productivity contract are
   user-owned and must remain byte-for-byte or semantically preserved?

All six questions have executable answers in the Reality Gate. The exact
component names and CSS selectors may evolve during implementation, but the
story boundary, API compatibility, proof obligations, and protected dirty hunks
are fixed.

## Baseline Evidence

| Check | Result |
| --- | --- |
| Focused Todo application tests | Passed 7/7 in 605 ms |
| API build | Passed, 0 errors; existing NU1902/NU1903 advisory warnings |
| EF pending-model check | Passed: no model changes since the latest migration |
| EF/live migration list | `InitialBaseline` and `AddHabitGoalsRemindersAndSelectedDay` present in both EF and live PostgreSQL |
| Live additive-column probe | Passed inside a rolled-back transaction; existing row read `is_important=false` |
| Frontend unit/component baseline | Passed 21 files and 76 tests |
| Frontend lint | Failed on two unused symbols: Todo `formatDay` caused by the approved removed date card, plus unrelated dirty Flashcard `RotateCw` |
| Frontend build | Failed on the same two TypeScript unused-symbol errors before Vite bundling |
| Focused Todo E2E runtime | Runtime reachable after IPv4 helper; old specs fail on the intentionally removed `TODO LIST` heading and `Selected todo date` input |
| Dependency audit | npm: axios high; NuGet graph: Microsoft.OpenApi high and AngleSharp moderate; tracked as backlog #6 |

## Planned Proof Matrix

| Layer | Required cases |
| --- | --- |
| Domain/Application | default importance false; create/read/update importance; field-scoped preservation; foreign/deleted owner nondisclosure; completion timestamps; manual reorder preservation |
| Persistence | migration SQL/default/index inspection; model snapshot consistency; live create/update/read round trip; no pending model changes |
| Frontend unit/component | required quick title; auto-select after create; row interaction isolation; title/note autosave dedupe; shared star; confirmed delete; context keyboard flow; Completed behavior; all three sorts; local preference; drag disables sort |
| E2E | authenticated My Day happy path; persistence after reload; Escape/X; delete cancel/confirm; narrow side-by-side layout; no page overflow; existing Week navigation/reorder/cross-day/explicit-move regression |
| Platform | focused backend tests/build, frontend lint/tests/build, dependency audit, browser console/network logs, `git diff --check`, and final dirty-file review |

## Candidate Commands

```text
dotnet test src/backend/FluentA.Application.UnitTests/FluentA.Application.UnitTests.csproj --no-restore --filter TodoServiceTests
dotnet build src/backend/FluentA.API/FluentA.API.csproj --no-restore
dotnet ef migrations has-pending-model-changes --project src/backend/FluentA.Infrastructure/FluentA.Infrastructure.csproj --startup-project src/backend/FluentA.API/FluentA.API.csproj --no-build
npm run lint
npm run test:run
npm run build
.\node_modules\.bin\playwright.cmd test e2e/todo-daily-foundation.spec.js e2e/todo-week-planning.spec.js --workers=1
npm audit --omit=dev --audit-level=high
dotnet list src/backend/FluentA.API/FluentA.API.csproj package --vulnerable --include-transitive
git diff --check
```

Run frontend commands from `src/frontend`. Browser proof must use the bounded
IPv4 helper described by C5. Full build proof after commit must also use the
clean-worktree control described by C4.

## Required Acceptance Evidence

| Requirement group | Evidence to record |
| --- | --- |
| API/data compatibility | focused test names, migration id/SQL findings, live PostgreSQL rows, and pending-model result |
| My Day interactions | Vitest assertions plus Chromium steps/screenshots for create/select/edit/star/complete/delete/menu/sort/reorder |
| Accessibility | keyboard-only Shift+F10/menu/focus/Escape trace and independent accessible names for row controls |
| Responsive layout | DOM width/overflow assertions and screenshots at approved desktop and narrow supported widths |
| Week preservation | existing Week Playwright result after navigation relocation |
| Repository hygiene | scoped diff showing protected user edits preserved, clean diff check, and no unrelated files changed by the story |

## Implementation Review - 2026-07-22

### Findings

- P1: none.
- P2: none.
- P3: none in the story scope.
- Existing platform warnings remain separately attributed: the dirty worktree
  has an unused `RotateCw` import and trailing whitespace in the user-owned
  `FlashcardViewerPage.tsx`; dependency backlog #6 tracks the pre-existing npm
  and NuGet advisories. This story does not edit or stage that file or upgrade
  dependencies.

### Acceptance Evidence

| Criterion | Evidence | Result |
| --- | --- | --- |
| My Day default and restricted header | Component and Chromium assertions show `My Day`, today's local label, page `...`, Sort, and no Grid, Group, Suggestions, visible Day/Week switch, or arbitrary date selector | Pass |
| Required title and create/select flow | Component test rejects whitespace; Chromium presses Enter, persists today's task, opens details, and proves title focus | Pass |
| Compact independent row controls | Accessible completion, exact title, and icon-only star controls are separate; note/delete are absent from the row | Pass |
| Details lifecycle | Component/Chromium cover row selection, editable title, note, shared importance, completion without close, X, Escape, and nested menu/dialog Escape ownership | Pass |
| Autosave and persistence | Component tests prove title Enter and note blur payloads; Chromium waits for real PATCH responses and verifies note/importance after reload | Pass |
| Confirmed delete | Component and Chromium prove no DELETE before confirmation, Cancel/Escape preservation, and confirmed removal | Pass |
| Restricted context menu | Shift+F10 browser proof exposes exactly completion, importance, and delete; Radix supplies right-click and keyboard navigation/focus behavior | Pass |
| Completed behavior | Component proof covers collapsed-by-default count, expansion, active restore, no sortable registration for completed rows, and newest-completion unit ordering | Pass |
| Automatic and manual ordering | Unit tests cover the three algorithms/local preference; Chromium proves preference survives reload, keyboard drag clears it, writes durable order, and reload preserves manual order | Pass |
| Week compatibility | Existing Week pointer reorder, cross-day move, note preservation, and accessible move implementation remain; updated Chromium regression passes after entering Week from page `...` and navigating weeks | Pass |
| Ownership and compatibility | Existing foreign-owner service test plus live second-account PATCH return `404`; API routes and envelope stay additive | Pass |

### Migration And Runtime Proof

- Generated only `20260721173125_AddTodoImportance` after the existing Habit
  migration. It adds `todo_items.is_important boolean NOT NULL DEFAULT false`;
  its Down removes only that column.
- `dotnet ef database update ... --configuration Release --no-build` applied
  that migration successfully to local PostgreSQL.
- The bounded Release API on `127.0.0.1:5001` created, updated, re-read, and
  owner-protected real tasks through the unchanged route family. The helper was
  stopped after proof; the user's API process on port 5000 was not touched.
- `dotnet ef migrations has-pending-model-changes ... --configuration Release
  --no-build` reports no model changes after the migration.

### Verification Results

| Command/check | Result |
| --- | --- |
| Focused Release `TodoServiceTests` | Pass, 8/8 |
| Release API build | Pass, 0 errors; existing NU1902/NU1903 warnings only |
| Focused Todo Vitest | Pass, 9/9 |
| Full frontend Vitest | Pass, 23 files and 85/85 tests; existing non-failing React test warnings remain |
| Scoped Todo/E2E ESLint | Pass, 0 findings |
| Todo Chromium | Pass, 4/4 with real API/database |
| Responsive geometry and screenshots | Pass at 320, 768, 1024, and 1440 px; no page overflow, list/panel both non-zero, visually inspected; desktop details share is 19-22% |
| Dirty-worktree full lint/build | Expected fail only at unrelated `FlashcardViewerPage.tsx:1` unused `RotateCw` |
| Exact staged-tree full lint/build | Pass in detached temporary worktree: ESLint clean; TypeScript/Vite production build clean; 21 files and 81/81 tests pass |
| Exact staged-tree backend controls | Pass after restore: Todo tests 8/8, Release API build 0 errors, EF no pending model changes; existing package advisories only |
| Scoped diff check | Pass for staged index; whole dirty tree reports only unrelated Flashcard whitespace |

### Reconciled Files And Boundaries

- Backend: Todo entity, additive DTO/service mapping, EF configuration,
  generated migration/snapshot, and focused application tests.
- Frontend: Todo API type, My Day components/date/sort/CSS/page, focused tests,
  and the two existing Todo E2E specs.
- Product: only the Todo section of `docs/product/personal-productivity.md` is
  part of this story. The pre-existing Countdown hunk must remain unstaged.
- Durable scope: this packet plus the approved Todo redesign context, approach,
  and story map. Future story packets remain planned with zero proof.
- Excluded: all unrelated Habit, Countdown, Pomodoro, Flashcard, design-system,
  and non-Todo E2E worktree changes.
