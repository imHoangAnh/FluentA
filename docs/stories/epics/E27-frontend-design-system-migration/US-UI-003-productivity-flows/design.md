# US-UI-003 Design

## Recommended Composition

All in-scope routes compose the existing `AppShell`. Feature routes retain
their queries, mutations, realtime hooks, timers, timezone calculations, drag
state, and derived collections. Shared components own only presentation,
focus/keyboard behavior, feedback, and reusable variants.

### Todo

- AppShell title/action area owns day/week switching and the create action.
- Daily view uses compact task rows with native checkbox, title, status, and
  menu/action controls; note remains in form/detail as defined by contract.
- Week view remains a seven-column planning surface with an intentional local
  horizontal scroll region at tablet width.
- Preserve semantic date navigation and task ordering. Characterize and lock
  the actual reorder/cross-day move behavior before changing markup because
  current product text, matrix evidence, E2E, and source are not aligned.

### Habits

- AppShell contains a two-column approximately 50/50 workspace: habit list and
  selected-habit detail.
- Week navigation and seven scheduled cells remain directly operable; disabled
  future/unscheduled states are visually and programmatically distinct.
- Monthly calendar is a feature component, not a generic design-system
  calendar, because eligibility and timezone rules are domain behavior.
- Use Radix Select/Popover only for presentation-safe choices. Create/edit and
  destructive confirmation use Dialog; semantic icons remain labeled options.
- Habit stats route uses AppShell and shared stat cards while keeping API-owned
  calculations.

### Countdowns

- Use a compact responsive card/list composition ordered by current API data.
- Preserve image covers as content, not decorative backgrounds that obscure
  labels or status.
- Create uses Dialog with native date input, repeatable alert rows, and the
  existing asset selection/upload path. No third-party calendar is required.
- Alert rows retain milestone/time values and validation; add/remove controls
  expose stable accessible names.

### Kanban

- AppShell content owns board tabs/selection, filters, and create-board action.
- The board is an intentional horizontal scroll container with fixed practical
  column widths; page-level overflow is not used.
- Cards use shared Badge/Card/Menu/Dialog primitives while retaining title,
  priority, deadline, and description rules.
- Preserve pointer drag/drop where shipped. Add or retain explicit Move controls
  using a labeled Select/Dialog so keyboard operation does not depend on drag.
- Remove presentation-only fake controls such as disabled search and static
  collaborator avatars unless validation discovers a real contract behind
  them; this is cleanup of misleading UI, not a feature removal.

### Pomodoro

- Use a focused timer card as the primary visual, with phase, remaining time,
  progress ring, and state-appropriate actions.
- Keep SVG progress as a feature visualization driven by current server state;
  only the calculated SVG style remains inline where CSS variables cannot
  express it cleanly.
- Task linking, daily statistics, configuration, and stopwatch occupy secondary
  cards with clear hierarchy.
- Radix Tabs may separate Pomodoro and Stopwatch only if both remain mounted or
  their current transient behavior is explicitly preserved; otherwise keep the
  simultaneous layout.
- Browser alert/sound and visible-tab auto-completion remain route behavior.

## Shared Primitive Additions

Add only primitives used by these routes and not already supplied by the
approved foundation or current `US-UI-002` worktree:

- Dialog/AlertDialog;
- Select and DropdownMenu;
- Checkbox, Label, Textarea;
- Progress and Alert;
- Tabs or ToggleGroup only where the selected-state contract benefits;
- Separator/ScrollArea only when native overflow cannot provide the same
  accessible behavior.

All variants use cva and `cn`; route code must not introduce a parallel token
or component system.

## State And Integration Boundaries

- API clients and DTOs under `src/frontend/src/lib/api/` remain unchanged.
- `ProtectedRoute` and existing realtime hooks remain the app-wide invalidation
  boundary for `TodoItemChecked`, `HabitChecked`, `KanbanCardMoved`, and
  `PomodoroSync`.
- Route mutations keep current optimistic/pessimistic ordering and cache
  invalidation. Presentation components receive state and callbacks.
- Countdown client clock and Pomodoro server timestamp calculations remain
  unchanged and are not moved into generic UI primitives.
- Asset selection/finalization remains owned by the current shared asset API.

## CSS Coexistence And Removal

1. Keep Tailwind Preflight disabled during the initiative bridge.
2. Do not add new feature CSS files.
3. Remove `DashboardPage.css`, `CountdownPage.css`, and `PomodoroPage.css`
   imports from a migrated route only after focused proof for that route.
4. Remove inline presentation styles and duplicated navigation markup.
5. Delete selectors only after an active-consumer search; defer shared global
   retirement to `US-UI-005`.

## Accessibility And Responsive Contract

- Native checkboxes, labeled controls, live validation regions, visible focus,
  disabled states, and keyboard-operable dialogs are required.
- Destructive actions are not icon-only without accessible names.
- Drag is never the only Kanban move path; Todo follows its reconciled approved
  contract.
- Desktop proof uses 1440x1000; tablet proof uses 1024x900.
- Intentional local horizontal scrolling is accepted for Todo week, Habit
  calendar, and Kanban board. The AppShell page itself must not horizontally
  scroll.
- Reduced motion disables nonessential transitions; timer/countdown value
  updates remain functional rather than animated.

## Rejected Alternatives

1. One generic productivity page component: rejected because calendar,
   board, and timer domain behaviors have different state boundaries.
2. New drag-and-drop framework during styling migration: rejected unless a
   separate approved compatibility decision proves it necessary.
3. Generic design-system calendar owning Habit eligibility: rejected because
   scheduled/future/timezone rules are domain-specific.
4. Client-only Pomodoro rewrite: rejected because Redis/server timestamps and
   SignalR are the shipped source of truth.
5. Permanent route CSS coexistence: rejected because later initiative closeout
   requires one active design system.

## Expected File Areas

- `src/frontend/src/components/AppShell.tsx` only for reusable shell needs
- `src/frontend/src/components/ui/` for minimum missing primitives
- `src/frontend/src/routes/todo/*`
- `src/frontend/src/routes/habits/*`
- `src/frontend/src/routes/countdown/*`
- `src/frontend/src/routes/kanban/*`
- `src/frontend/src/routes/pomodoro/*`
- Existing focused tests under `src/frontend/e2e/` and new component tests
- Bounded legacy CSS/import cleanup and E27 story evidence
