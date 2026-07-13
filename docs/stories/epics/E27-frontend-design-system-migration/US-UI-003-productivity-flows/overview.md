# US-UI-003 Overview

## Status

implemented

## Lane

high-risk

## Story Outcome

Deliver the third E27 approval milestone: Todo, Habits, Countdowns, Kanban, and
Pomodoro use the approved AppShell, semantic tokens, shared primitives, and
desktop/tablet layout system while preserving their current CRUD, calendar,
ordering, timer, realtime, and ownership behavior.

## Current Behavior

- All five product areas are implemented and have focused API-backed
  Playwright coverage, but their presentation is split across global legacy
  selectors, route CSS, repeated dashboard navigation, inline styles, and
  feature-specific button/modal conventions.
- Todo imports `DashboardPage.css`; its day/week views use legacy rows and
  week-column classes.
- Habits duplicates the old dashboard shell, uses a dense list/detail calendar
  layout, and implements a custom icon listbox and modal.
- Countdowns duplicates the old shell, depends on `CountdownPage.css`, and uses
  a custom create modal with repeated alert controls and optional cover asset.
- Kanban duplicates the old shell, uses custom modal and drag markup, includes
  presentation-only disabled/search/avatar elements, and depends heavily on
  legacy global selectors.
- Pomodoro duplicates navigation, depends on `PomodoroPage.css`, and combines
  server timer state, task linking, settings, statistics, and a client-only
  stopwatch in one route.

## Target Behavior

- `/todo`, `/habits`, `/habits/:habitId/stats`, `/countdowns`, `/kanban`, and
  `/pomodoro` render inside the approved AppShell with correct active states.
- Shared Dialog, Select, Checkbox, Tabs/segmented controls, Alert, Progress,
  Textarea, Skeleton, Card, Badge, Input, and Button primitives replace custom
  presentation controls only where their behavior matches the existing
  contract.
- Todo keeps compact daily rows and a horizontally usable seven-day week.
- Habits keeps the approved approximately 50/50 list/detail layout, selected
  week controls, monthly calendar, semantic icons, and stats route.
- Countdowns use clear active/completed cards and an accessible create dialog
  for date, alerts, and optional cover selection.
- Kanban keeps a horizontally scrollable board, pointer drag where currently
  shipped, and an explicit keyboard-accessible Move action.
- Pomodoro presents one clear timer hierarchy while retaining server state,
  task linking, controls, settings, daily totals, and transient stopwatch.

## Relevant Product Docs

- `docs/product/personal-productivity.md`
- `docs/product/kanban.md`
- `docs/product/pomodoro.md`
- `docs/stories/epics/E27-frontend-design-system-migration/context.md`

## Acceptance Criteria

1. Every in-scope route uses AppShell and no longer duplicates the old
   dashboard/workspace navigation.
2. Todo preserves daily and week navigation, create/update/complete/delete,
   incomplete-before-completed ordering, notes, date assignment, and the
   currently approved desktop ordering/move contract after baseline
   reconciliation.
3. Habits preserve create/edit/delete, semantic icon selection, custom
   weekdays, reminder preference, past/current eligible toggles, disabled
   future/unscheduled cells, week navigation, selected detail, monthly grid,
   statistics, timezone behavior, and cross-tab refresh.
4. Countdowns preserve create/delete, date-only target, one-to-five alerts,
   duplicate/past validation, optional finalized cover asset, live remaining
   time, completed state, and empty/loading/error feedback.
5. Kanban preserves board/column/card CRUD, non-empty column protection,
   priority/deadline filters, pointer movement, explicit Move controls,
   ordering, horizontal board scrolling, ownership behavior, and cross-tab
   refresh.
6. Pomodoro preserves configuration, task linking, Idle/Running/Paused
   transitions, reset/complete, server-derived remaining time, long-break
   cadence, daily count, browser alert behavior, realtime sync, and transient
   stopwatch/laps.
7. Destructive actions and forms use accessible dialogs with initial focus,
   Escape behavior, focus return, pending state, validation feedback, and
   explicit confirmation where the current product contract requires it.
8. Desktop Chromium at 1440x1000 and tablet Chromium at 1024x900 remain usable
   without clipped primary actions or unintended page-level horizontal
   overflow. Horizontal scrolling remains intentional inside week/calendar and
   Kanban board regions. Mobile-specific quality is out of scope.
9. Existing API routes, query keys, SignalR events, Redis timer state, and
   authorization rules do not change. The user-approved Todo week contract is
   the bounded exception: the existing authenticated Todo PATCH DTO and Todo
   schema add `date`/`sortOrder` so week reorder and cross-day Move persist.
10. Focused Vitest, productivity Playwright scenarios, targeted lint,
    production build, keyboard review, realtime two-tab proof, and milestone
    screenshots pass or record unrelated pre-existing failures.

## Non-Goals

- New productivity features, API routes, notification rules, background jobs,
  task types, timer modes, search, tags, or dashboard aggregation. The approved
  Todo ordering fields are contract reconciliation, not a new product area.
- Replacing native browser drag behavior with a new drag-and-drop library
  unless validation proves the current implementation cannot meet the locked
  keyboard/desktop contract and the user approves that expansion.
- Persisting stopwatch laps or adding server background timer completion.
- Mobile-specific drag-and-drop, navigation, or layout acceptance.
- Dark mode, Firefox/WebKit remediation, or initiative-wide CSS retirement.

## Dependencies And Gate

- E27 decisions D1-D14 remain locked.
- The `US-UI-002` plan is approved, but its existing source changes and release
  proof remain independent worktree state and are not modified here.
- High-risk validation must reconcile the current Todo source/product/E2E
  ordering contract before implementation.
- Plan approval is required before any `US-UI-003` source change.
