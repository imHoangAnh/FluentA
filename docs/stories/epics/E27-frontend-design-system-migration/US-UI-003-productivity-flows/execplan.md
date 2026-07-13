# US-UI-003 Exec Plan

## Goal

Produce the third user-approved E27 milestone while preserving productivity
business rules, realtime events, authorization, and timer ownership. The
approved Todo week contract permits the bounded PATCH/schema ordering change
documented in the story overview and validation evidence.

## Risk Classification

Lane: high-risk.

Risk flags:

- five behavior-rich protected product areas;
- Todo/Kanban ordering and pointer drag interactions;
- calendar/date/timezone eligibility;
- destructive CRUD and asset-backed Countdown forms;
- Redis-backed Pomodoro state machine and browser timers;
- SignalR cross-route/cross-tab cache invalidation;
- global CSS collision and wide tablet layouts.

## Dependency-Ordered Phases

1. **Baseline and contract reconciliation**
   - Preserve existing `US-UI-001/002` worktree changes.
   - Capture route map, CSS imports, source behavior, product docs, matrix rows,
     focused tests, AppShell compatibility, and 1440/1024 screenshots.
   - Reconcile Todo contradiction: `personal-productivity.md` says week reorder
     and cross-day move are not in the current contract, while `US-TODO-002`
     and `todo-week-planning.spec.js` claim them, and current `TodoWeekView`
     does not expose drag handlers. Stop for a product decision if repository
     truth cannot identify the approved behavior.
   - Characterize Kanban filters/move paths and remove no apparent fake control
     until its lack of contract is proven.
2. **Complete shared productivity primitives**
   - Add only missing Dialog/AlertDialog, Select/Menu, Checkbox/Label/Textarea,
     Alert/Progress, and optional Tabs/Toggle primitives.
   - Prove focus trap/return, keyboard selection, disabled state, and semantic
     variants with focused component tests.
3. **Migrate Todo**
   - Replace duplicate shell and legacy classes for daily/week views and form.
   - Preserve date navigation, CRUD, ordering, completion, notes, and the
     reconciled week interaction contract.
   - Run Todo and cross-tab proof before continuing.
4. **Migrate Habits and Habit Stats**
   - Build the AppShell 50/50 list/detail layout, week strip, calendar, dialogs,
     and stat cards.
   - Preserve timezone/eligibility rules, reminder preferences, and realtime
     invalidation.
5. **Migrate Countdowns**
   - Build card/list states and accessible repeatable-alert create dialog.
   - Preserve asset linkage, validation, live countdown text, completion, and
     delete behavior.
6. **Migrate Kanban**
   - Build board selection, filters, horizontal columns, cards, edit/create
     dialogs, drag, and explicit Move path.
   - Prove CRUD, non-empty column conflict, ordering, filters, ownership, and
     same-user two-tab sync.
7. **Migrate Pomodoro**
   - Recompose timer, task link, controls, stats, settings, and stopwatch.
   - Prove every transition, server-derived time, long-break cadence, browser
     completion alert, history count, and two-tab sync.
8. **Remove bounded legacy dependencies**
   - Remove migrated route CSS imports, duplicate navigation, inline
     presentation, and selectors with no active consumers.
9. **Milestone proof and approval**
   - Run unit, targeted/full lint, build, focused Chromium E2E, keyboard review,
     deterministic 1440/1024 screenshots, source scans, and bundle comparison.
   - Present the running milestone and stop for approval before `US-UI-004`.

## Concrete Proof Ladder

```powershell
npm --prefix src/frontend run test:run
npm --prefix src/frontend run lint
npm --prefix src/frontend run build
npx --prefix src/frontend playwright test `
  e2e/todo-daily-foundation.spec.js `
  e2e/todo-week-planning.spec.js `
  e2e/personal-productivity-integration.spec.js `
  e2e/habit-grid.spec.js `
  e2e/habit-stats.spec.js `
  e2e/habit-sync.spec.js `
  e2e/countdown-events.spec.js `
  e2e/kanban-board.spec.js `
  e2e/kanban-sync.spec.js `
  e2e/pomodoro-config.spec.js `
  e2e/pomodoro-complete.spec.js `
  e2e/pomodoro-history.spec.js `
  e2e/pomodoro-sync.spec.js --workers=1
git diff --check
```

Use the repository's actual Playwright project configuration discovered during
validation; do not assume a named `chromium` project exists. Add deterministic
desktop/tablet visual scenarios for representative loading, empty, populated,
dialog, wide-board/calendar, and active timer states.

## Stop Conditions

- Todo ordering/move behavior remains contradictory after source, product-doc,
  story, history, and test inspection.
- Any required change reaches API, DTO, schema, ownership, SignalR payload,
  Redis timer, background job, or asset contracts.
- A route behavior is broken at baseline and repair exceeds presentation scope.
- A new drag library or timer architecture appears necessary without explicit
  user approval.
- `US-UI-002` worktree conflicts with shared primitives/AppShell in a way that
  cannot be isolated safely.

## Approved Plan Deviation

Baseline reconciliation proved the locked Todo week behavior could not persist
through the prior title/note/completion-only update DTO. The user approved a
bounded expansion of the existing authenticated PATCH route with `date` and
`sortOrder`, plus the corresponding migration. No route, ownership rule,
SignalR payload, or broader architecture changed.

## Rollback Boundary

Each route group is migrated and proven before the next begins. Presentation
changes remain route-bounded; the Todo ordering migration is the only database
rollback boundary and must stay paired with its DTO/service/repository tests.
