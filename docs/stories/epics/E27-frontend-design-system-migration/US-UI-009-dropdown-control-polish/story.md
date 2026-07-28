# US-UI-009 Polish dropdown controls and menus

## Status

implemented

## Lane

normal

## Product Contract

FluentA presents native select controls, action dropdowns, and context menus with one consistent visual language while preserving every existing value, action, route, and keyboard interaction.

## Relevant Product Docs

- `docs/ARCHITECTURE.md`

## Acceptance Criteria

- Native single-select controls use the FluentA surface, border, radius, spacing, and chevron treatment without changing their values or events.
- Dropdown and context menu surfaces share a consistent radius, elevation, spacing, item height, highlighted state, disabled state, and destructive state.
- Keyboard focus remains visible inside select controls and Radix menu keyboard navigation continues to work without adding an outer input outline.
- Feature-specific layouts such as Notifications and Vocabulary table cells retain their intended dimensions and content density.

## Design Notes

- Commands: frontend focused Vitest, ESLint, TypeScript/Vite build, and Playwright browser proof.
- Queries: Harness intake `#115`.
- API: unchanged.
- Tables: unchanged.
- Domain rules: unchanged.
- UI surfaces: shared context menu, Vocabulary, Todo, Notifications, Level 5 settings, Countdown, Pomodoro, Habits, Kanban, Review, and Trash selects.

## Validation

When updating durable proof status, use numeric booleans:
`scripts/bin/harness-cli story update --id US-UI-009 --unit 1 --integration 1 --e2e 0 --platform 0`.

| Layer | Expected proof |
| --- | --- |
| Unit | Shared dropdown/context menu class and keyboard interaction coverage. |
| Integration | Existing feature tests for changed dropdown consumers. |
| E2E | Chromium proof for one native select and one Radix dropdown. |
| Platform | Frontend lint and production build. |
| Release | Not required for this presentation-only story. |

## Harness Delta

No Harness framework change is required.

## Evidence

- Focused Vitest: `25/25` passed across the shared menu, Level 5 settings, Vocabulary table, Countdown, and Todo suites.
- Full frontend Vitest: `117/119` passed. The two failures are confined to the unrelated in-progress Journal redesign tests, whose expected `journal-workspace` and `Journal title` elements are not present in the current Journal component.
- Targeted ESLint for every changed frontend implementation/test file: passed.
- Full ESLint remains blocked outside this story by the existing restricted Notes-to-Trash deep import, plus one Trash `useMemo` warning.
- Production `npm run build`: passed; existing SignalR/Rolldown pure-annotation warnings remain non-blocking.
- Playwright `e2e/dropdown-polish.spec.js`: `1/1` passed against `127.0.0.1:5173`, verifying native select chevron/radius/height/inset focus and Todo menu radius/padding/shadow/item height.
- Harness `story verify US-UI-009`: passed through the durable `verify.ps1` command (shared menu unit test plus production build).
- `git diff --check`: passed; Git reported line-ending conversion warnings only.
