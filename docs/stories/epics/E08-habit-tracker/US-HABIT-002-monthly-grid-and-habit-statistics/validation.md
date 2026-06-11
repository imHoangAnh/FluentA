# Validation

## Proof Strategy

Prove the React route and grid behavior with unit/component tests first, then
run lint/build proof. If the local API and browser stack are available, finish
with a focused Playwright smoke that creates a habit and toggles an eligible
date without hard-reloading the authenticated SPA.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit/component | Protected route renders for authenticated users; empty state; create/edit form; custom weekday selection; month grid renders current-month days; future and unscheduled custom cells are disabled; summary stats render. |
| Integration | TanStack Query mutations call existing Habit API functions and invalidate Habit queries. |
| E2E | Authenticated browser smoke creates a daily habit, toggles today's cell, verifies checked state, and checks mobile horizontal grid usability. |
| Platform | `npm run lint`, `npm run test:run`, and `npm run build` pass with existing known third-party SignalR/Rolldown warnings only. |

## Commands

Expected after implementation:

```text
npm run lint
npm run test:run
npm run build
focused Habit browser smoke
```

## Acceptance Evidence

Implemented and validated on 2026-06-11:

- `npm run lint` passed.
- `npm run test:run` passed 24 frontend tests.
- `npm run build` passed with the existing third-party SignalR/Rolldown pure
  annotation warnings.
- `npx playwright test e2e/habit-grid.spec.js` passed:
  - registered and verified a new learner;
  - opened `/habits` from protected navigation;
  - created a daily habit through the form;
  - toggled today's grid cell and observed the checked state;
  - edited the habit name;
  - verified the monthly grid is horizontally scrollable at `390x800`;
  - deleted the habit and returned to the empty state;
  - observed no relevant application console errors.
