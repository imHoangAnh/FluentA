# US-UI-003 Validation Plan

Date: 2026-07-13

## Status

`PLANNED — AWAITING PLAN APPROVAL AND HIGH-RISK VALIDATION`

No implementation proof flags are claimed by this planning artifact.

## Acceptance Evidence Matrix

| Surface | Required states and interactions | Proof |
| --- | --- | --- |
| AppShell routes | correct Todo/Habits/Countdowns/Kanban/Pomodoro active states, protected redirect, tablet collapse | semantic navigation assertions plus 1440/1024 screenshots |
| Todo daily | loading, empty, error, create, edit, complete/uncomplete, delete, day navigation, ordering | focused UI tests plus `todo-daily-foundation.spec.js` |
| Todo week | seven days, week navigation, selected create date, compact cards, reconciled reorder/move behavior | characterization plus `todo-week-planning.spec.js` after contract lock |
| Habit list/detail | loading/empty/error, select, create/edit/delete, semantic icon, weekdays, reminders, week navigation/toggle | focused tests plus `habit-grid.spec.js` |
| Habit calendar/stats | scheduled/past/current/future states, month navigation, timezone, four statistics | `habit-grid.spec.js` and `habit-stats.spec.js` |
| Countdown | empty/list/completed, create validation, 1-5 alerts, optional cover, delete, live remaining time | focused tests plus `countdown-events.spec.js` |
| Kanban | boards, columns, cards, priority/deadline filters, drag, explicit Move, conflicts, horizontal scroll | focused tests plus `kanban-board.spec.js` |
| Pomodoro | config, Idle/Running/Paused, task link, reset/complete, break cadence, daily stats, browser alert, stopwatch/laps | existing Pomodoro focused specs plus timer UI tests |
| Realtime | TodoItemChecked, HabitChecked, KanbanCardMoved, PomodoroSync across protected routes/tabs | existing personal-productivity, habit, Kanban, and Pomodoro two-tab specs |
| Accessibility | dialogs, errors, checkbox/select/menu, destructive confirmation, keyboard Move, focus return | component tests plus manual keyboard review |
| Viewports | no clipped actions/page overflow at 1440x1000 and 1024x900; intentional local scroll only | deterministic Chromium screenshots and overflow assertions |
| CSS boundary | no duplicated shell, migrated route CSS import, or unnecessary inline presentation | import/selector/consumer scan plus visual proof |

## Baseline Commands

Run during the high-risk validation phase before implementation:

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
```

Record exact test counts, API/frontend runtime state, browser project/config,
bundle sizes, screenshots, and all pre-existing failures.

## Required Manual Checks

- Complete daily Todo CRUD and the approved week ordering/move workflow using
  pointer and keyboard-supported alternatives.
- Toggle eligible and disabled Habit week/month cells and verify disabled
  semantics, focus visibility, selected state, and timezone-sensitive labels.
- Create a Countdown with multiple alert rows; exercise validation, cover
  selection, dialog Escape/focus return, and delete confirmation.
- Move a Kanban card by pointer and explicit Move control; operate filters and
  card dialog without a mouse; verify only the board region scrolls.
- Exercise every Pomodoro state action, linked task, settings form, and
  stopwatch control; verify visible phase/time feedback without relying on
  color alone.
- Inspect desktop and tablet loading, empty, populated, error, dialog, and
  wide-content states. Do not use mobile or Firefox/WebKit as blocking proof.

## Known Baseline Risks To Reconcile

- Todo contract drift: product documentation excludes week reorder/cross-day
  move, Harness `US-TODO-002` and its Playwright scenario require them, while
  current `TodoWeekView.tsx` has no drag handlers. This is a validation blocker,
  not permission to invent behavior.
- The worktree contains existing in-progress `US-UI-002` source changes and
  unrelated E2E/doc changes. Preserve them and attribute failures precisely.
- Kanban currently includes disabled/static presentation controls without an
  apparent product contract. Confirm they are nonfunctional before removing
  them during controlled redesign.
- The current Playwright config reportedly has no named `chromium` project;
  validation must use the actual configured Chromium path instead of copying a
  non-existent project selector.
- Global build/lint may remain affected by changes outside `US-UI-003`; focused
  target checks do not replace the required truthful full result.

## Completion Gate

Do not mark `US-UI-003` implemented until:

1. Todo contract drift is resolved and documented;
2. all acceptance criteria have durable evidence;
3. no P1/P2 productivity, realtime, accessibility, timer, or AppShell finding
   remains;
4. product docs, active source, tests, and Harness proof agree;
5. numeric proof flags and trace reflect only commands actually run;
6. the user approves the running desktop/tablet milestone.
