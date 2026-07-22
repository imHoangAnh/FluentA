# US-POMO-005 Compact Timer Workspace

## Status

implemented — approved behavior delivered and reviewed on 2026-07-21

## Lane

normal

## Product Contract

Refine the existing `/pomodoro` workspace into a compact timer-first layout
without changing Pomodoro configuration persistence, timer transitions,
session statistics, task linking, realtime synchronization, automatic
completion, notifications, or client-only stopwatch behavior.

## Relevant Product Docs

- `docs/product/pomodoro.md`

## Approved Decisions

- `POMO-D1`: Remove the visible `Pomodoro`/`Focus Timer` page title from the
  workspace content.
- `POMO-D2`: Treat the `Pomo | Stopwatch` segmented control and the content
  beneath it as one left-side timer workspace, matching the approved reference.
- `POMO-D3`: Place an icon-only Settings action on the same row as the segmented
  control. It opens an accessible centered Configuration modal.
- `POMO-D4`: The Configuration modal retains all four current settings and the
  current save behavior.
- `POMO-D5`: The Pomo view keeps the phase, progress timer, and timer controls.
  The Stopwatch view keeps Start/Pause, Lap, Reset, and transient lap history.
- `POMO-D6`: The right column contains Daily Statistics above Target Task.
  On narrow viewports, that column stacks below the active timer view.
- `POMO-D7`: Preserve current design-system colors and all existing API,
  persistence, task-linking, and realtime contracts.

## Acceptance Criteria

- The left workspace shows the `Pomo | Stopwatch` segmented control with the
  icon-only Settings action on the same row.
- Switching modes changes only the left workspace content and does not reset or
  remove the existing stopwatch controls and lap history unexpectedly.
- Settings opens a centered modal, supports cancel/close, and saves the same
  four configuration values through the existing API.
- Daily Statistics and Target Task appear in the right column on desktop and
  stack below the timer on narrow viewports without horizontal overflow.
- Existing timer transitions, linked-task start input, automatic completion,
  today count, notifications, and SignalR invalidation continue to work.
- No API, database schema, migration, backend, or route change is introduced.

## Design Notes

- API: unchanged Pomodoro endpoints.
- Domain rules: unchanged.
- UI surfaces: `PomodoroPage`, focused frontend tests, and Pomodoro E2E proof.

## Implementation Plan

1. Preserve all existing React Query keys, mutations, automatic-completion
   effect, notification behavior, and linked-task payload construction.
2. Add local `Pomo | Stopwatch` mode state. Render the segmented control and
   icon-only Settings trigger in one left-workspace toolbar.
3. Keep the current timer view and stopwatch state in the mounted page so mode
   changes do not unexpectedly reset an active stopwatch or lap history.
4. Move Daily Statistics and Target Task into the right column, in that order.
5. Extract the Configuration form into a focused component backed by the shared
   Radix Dialog. The parent retains server state and submits the same PATCH.
6. Replace Pomodoro-owned layout selectors in `design-system.css` with a compact
   two-column desktop layout and a single-column narrow layout.
7. Add page-level component proof and update existing Pomodoro browser scenarios
   for mode switching, settings modal, linked task, statistics, and stopwatch.

Expected source boundaries:

- `src/frontend/src/features/pomodoro/pages/PomodoroPage.tsx`
- `src/frontend/src/features/pomodoro/components/PomodoroConfigurationDialog.tsx`
- `src/frontend/src/features/pomodoro/pages/PomodoroPage.test.tsx`
- `src/frontend/src/styles/design-system.css`
- focused `src/frontend/e2e/pomodoro-*.spec.js` scenarios

Rejected alternatives:

- Do not retain the large Configuration card because the approved interaction
  is an icon trigger plus centered modal.
- Do not navigate to separate routes for Pomo and Stopwatch; the approved
  segmented control switches only the left workspace.
- Do not move Daily Statistics or Target Task into a drawer because both must
  remain visible in the desktop right column.

## Risks And Required Proof

| Risk | Cause and effect | Required proof |
| --- | --- | --- |
| Mode switch resets transient stopwatch state | Conditional content can be remounted with local state inside it | Stopwatch state remains page-owned; component and E2E switch-away/switch-back proof |
| Modal edits leak before Save | Form values can mutate cached config while dialog is open | Cancel/reopen proof restores saved values; PATCH occurs only on Save |
| Timer regression | Layout refactor can disturb command handlers or zero-completion effect | Existing config/history/complete/sync tests plus focused control assertions |
| Right column overflows | Task names and statistics can exceed narrow containers | 320/768/1024/1440 viewport checks with long task labels |
| Shared stylesheet overlap | Habit compact-layout edits already exist in the same file | Pomodoro-selector-only diff review and `git diff --check` |

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Mode switching, modal lifecycle/config save, timer/task/stat rendering |
| Integration | Existing API-backed behavior only; no new backend integration |
| E2E | Pomo controls, Stopwatch controls/laps, settings modal, linked task, daily count |
| Platform | Frontend build, focused lint, desktop/narrow overflow screenshots |
| Release | Existing Pomodoro config/history/completion/sync regression remains green |

### Readiness Gate — 2026-07-21

Result: `READY WITH CONSTRAINTS`

| Assumption | Risk | Evidence | Result |
| --- | --- | --- | --- |
| Mode switching can remain frontend-only | Adding routes or backend state would expand the contract | Current Stopwatch is client-only page state and current Pomo commands already share one route | READY |
| Configuration can move into a modal unchanged | Modal edits could mutate server/cache before Save | Current PATCH occurs only in `submitConfig`; shared Radix Dialog exists for focus-managed presentation | READY |
| Moving panels does not require API changes | Statistics or tasks might depend on layout-specific queries | `today`, Todo, Kanban, config, and current queries are independent of the rendered column | READY |
| Existing browser behavior is green before the edit | A pre-existing regression could be misattributed to the layout | Config persistence and linked Todo/Stopwatch scenarios passed against live API and Vite on 2026-07-21 | READY |
| Shared CSS can be edited safely | The file contains uncommitted Habit refinements | Current diff is limited to Habit selectors; implementation is constrained to Pomodoro-owned selectors and path-scoped review | READY WITH CONSTRAINT |
| Full build is a reliable baseline | Unrelated dirty files can block TypeScript | Baseline build is blocked by unused `RotateCw` in FlashcardViewerPage and `formatDay` in TodoPage; focused Countdown/Pomodoro lint passed | CONSTRAINT |

## Harness Delta

- Add `US-POMO-005` as a normal UI refinement story under the existing Pomodoro epic.

## Evidence

Implementation and review evidence is recorded in
`US-POMO-005-compact-timer-workspace/validation.md`. Focused component proof,
the complete existing API-backed Pomodoro browser suite, production bundling,
desktop/narrow visual inspection, overflow checks, and scoped diff review
passed. The repository-wide TypeScript build remains blocked only by the two
documented pre-existing dirty files outside this story.
