# Validation

## Readiness Status

`READY WITH CONSTRAINTS` on 2026-07-12. Implementation remains behind the
human execution approval gate.

## Reality Gate

| Assumption | Risk | Evidence | Result |
| --- | --- | --- | --- |
| The approved semantic icons exist in the installed UI library. | A missing export would force a presentation-contract change. | A Node import probe against the installed `lucide-react` resolved `CircleDot`, `BookOpen`, `Dumbbell`, `Droplets`, `Brain`, `GraduationCap`, `BriefcaseBusiness`, and `HeartPulse`. | READY |
| The current API can represent a Monday-Sunday week crossing a month boundary. | The month-scoped entries endpoint could require a new API. | `HabitPage.tsx` already uses `useQueries`; `HabitService.ListEntriesAsync` accepts `YYYY-MM` and returns owned entries for that full month. A selected week intersects at most two months, so the frontend can issue and merge at most two month requests per Habit. | READY |
| The schema change fits the existing persistence boundary. | Removing `color` and constraining `icon` could require table replacement or data deletion. | `HabitConfiguration` maps both as independent columns. EF CLI 9.0.10 restored, built the startup project, and listed the current migration chain. The planned migration can drop `color`, alter `icon`, and update the snapshot without deleting Habit/HabitEntry tables. Generated operations still require inspection during implementation. | READY WITH CONSTRAINTS |
| The current feature baseline is green. | Pre-existing failures could hide regressions. | Focused backend baseline passed 5 Domain Habit tests and 8 Application HabitService tests. Frontend baseline passed 35 Vitest tests across 8 files and the production build. Build emitted only the existing SignalR pure-annotation and chunk-size warnings. | READY |
| A 50/50 desktop/tablet layout can keep seven cells usable. | At 1025-1279 pixels the fixed 280-pixel app sidebar leaves only about 373-500 pixels for the left half. A single-line icon/name/streak/seven-cell row is not robust. | `DashboardPage.css` hides the app sidebar at 1024 pixels and below, but shows it above 1024; the current Habit sidebar is capped at 420 pixels. A card metadata line above the aligned seven-cell grid fits the approved content without page-level horizontal scrolling or a global navigation breakpoint change. | READY WITH CONSTRAINTS |
| Existing browser proof can observe the new acceptance state. | Stale selectors or mobile assertions could falsely fail or miss the redesign. | `habit-grid.spec.js` currently targets the older grid/form selectors and asserts a 390x800 mobile horizontal-scroll behavior that is outside D12. It must be replaced with desktop/tablet, enum dropdown, week navigation, and cell eligibility assertions. | READY WITH CONSTRAINTS |

## Constraints For Implementation

- Render icon/name/current-streak on a metadata line above each Habit card's
  seven aligned weekday cells; do not force all content into one horizontal
  line at 1025-1279 pixels.
- Do not change the global Dashboard sidebar breakpoint solely for this story.
- Bound selected-week entry loading to one month request per Habit normally and
  two only when the week crosses a month/year boundary. The independently
  selected detail calendar may add one further month request for the selected
  Habit when it is outside the selected week.
- Inspect the generated EF migration before applying it. It may drop `color`
  and alter/default `icon`, but it must not delete Habit/HabitEntry rows or add
  legacy emoji conversion SQL.
- Rewrite stale focused Habit browser proof around desktop/tablet acceptance;
  do not retain the old 390x800 assertion as proof for this story.

## Proof Strategy

Prove the contract replacement from domain through PostgreSQL and all three UI
surfaces. Weekly behavior must be tested with deterministic learner-local dates
including a week spanning two months, Custom schedules, future dates, and both
desktop and tablet viewports.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | Aggregate defaults to `Default`; accepts all eight enum values; application create/update/list/stats round-trip semantic icons; invalid icon returns field validation; no color validation remains; scheduling/streak tests stay green. |
| Integration | EF migration produces required string `icon`, drops `color`, preserves Habit/HabitEntry tables, and supports create/read/update after a development DB reset. API envelopes omit `color`. |
| E2E | Create/edit each representative icon; dropdown has exactly eight choices; Habit/Stats/Dashboard render mapped icons; Monday-Sunday alignment; previous/future week navigation; cross-month week entries; eligible past/today toggles; future and unscheduled cells disabled; description placement. |
| Platform | Desktop 1440x900 and tablet 1024x768 retain two usable columns without page-level horizontal overflow. Mobile is explicitly not acceptance scope. |
| Performance | Selected-week entry loading remains bounded to at most two month requests per Habit, the selected detail calendar adds at most one distinct month, and no cell causes its own read request. |
| Logs/Audit | No new logging required; browser console has no relevant errors and existing toggle requests/SignalR invalidation remain successful. |

## Fixtures

- One Daily Habit with `Book`, a non-empty description, and entries around a
  month boundary.
- One Custom Habit with `Water`, scheduled on a subset of weekdays.
- One Habit using `Default` with an empty description.
- A selected future week containing only disabled date cells.
- Authenticated owner fixture using a fixed browser timezone.

## Planned Commands

```powershell
dotnet test src/backend/FluentA.Domain.UnitTests/FluentA.Domain.UnitTests.csproj --filter Habit
dotnet test src/backend/FluentA.Application.UnitTests/FluentA.Application.UnitTests.csproj --filter HabitServiceTests
dotnet build src/backend/FluentA.slnx
dotnet tool run dotnet-ef migrations script --idempotent --project src/backend/FluentA.Infrastructure --startup-project src/backend/FluentA.API
npm --prefix src/frontend run lint
npm --prefix src/frontend run test:run
npm --prefix src/frontend run build
npm --prefix src/frontend run test:e2e -- habit-grid.spec.js habit-stats.spec.js
```

Add or adjust the focused dashboard icon scenario during implementation and
include it in the final browser command.

## Acceptance Evidence

Implementation evidence captured on 2026-07-12:

- Domain Habit filter passed 5 tests.
- Application `HabitServiceTests` passed 9 tests, including exact semantic icon
  validation and the omitted-icon `Default` behavior.
- Backend solution build passed with zero errors. It retains the pre-existing
  `NU1903` high-severity advisory for `Microsoft.OpenApi` 2.0.0.
- Focused ESLint passed for every changed Habit/icon/Dashboard TypeScript file.
- Frontend Vitest passed 36 tests across 9 files, including exhaustive rendering
  of all eight semantic icons.
- Frontend production build passed with the existing SignalR pure-annotation
  and large-chunk warnings.
- Generated migration SQL drops only `habits.color`, changes `habits.icon` to
  `varchar(10)`, normalizes null icons to `Default`, and makes the column
  required with the `Default` database default. It contains no table/row delete
  or legacy emoji conversion.
- Active source/product-contract search found no stale Habit `color`, free-form
  emoji input, or `habit.color`/`stats.color` references. Historical migration
  snapshots are intentionally excluded from that assertion.
- `git diff --check` passed with line-ending conversion warnings only.

Live release proof completed after the approved development-database reset:

- PostgreSQL, Redis, MinIO, API, and frontend started successfully.
- The existing fresh-database migration chain initially failed in
  `MoveLearningTablesBackToPublic` because it expects pre-schema names for two
  foreign keys and seven primary keys. Those constraints were renamed only in
  the reset development database, after which the full chain and
  `ReplaceHabitColorWithSemanticIcon` applied successfully. This pre-existing
  bootstrap defect is tracked as Harness backlog #3; no historical migration
  source was rewritten in this story.
- Live PostgreSQL inspection shows only required `habits.icon` with database
  default `Default`; `habits.color` is absent. The latest applied migration is
  `20260712151359_ReplaceHabitColorWithSemanticIcon`.
- Focused Playwright passed 2/2. It proved the eight-option icon dropdown,
  create/render/toggle behavior, previous/future week navigation, disabled
  future cells, description placement, equal desktop columns, tablet two-column
  layout without page overflow, and the Habit Stats flow.

Known repository warnings not caused by this story:

- Full repository lint remains red only in pre-existing unrelated code:
  `ReviewSessionPage.tsx:127` and `NotesPage.tsx:102` violate
  `react-hooks/set-state-in-effect`.
- `npm audit --audit-level=high` reports existing high-severity advisories in
  `form-data` and `undici`, with fixes available via dependency updates. No
  dependency was changed in this story.

Review outcome: `US-HABIT-005` meets D1-D14 with unit, live migration,
integration, E2E, and desktop/tablet platform proof. The pre-existing full-lint,
dependency-advisory, and fresh-bootstrap-migration findings remain separately
reported and do not originate from the Habit change.
