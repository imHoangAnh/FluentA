# Validation

## Proof Strategy

Prove the listener compiles and does not disturb existing tests, then prove the
real event flow with a focused two-tab Playwright scenario.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit/component | Existing protected-route tests still pass with realtime hooks disabled in test mode. |
| Integration | `useHabitSync` listens for `HabitChecked` and invalidates Habit plus future Dashboard query keys. |
| E2E | Two authenticated tabs: one toggles a Habit cell; the other is on another protected route, refetches Habit caches from the event, and shows the checked state when returning to `/habits`. |
| Platform | `npm run lint`, `npm run test:run`, and `npm run build` pass with existing known third-party SignalR/Rolldown warnings only. |

## Commands

Expected after implementation:

```text
npm run lint
npm run test:run
npm run build
npx playwright test e2e/habit-sync.spec.js
npm --prefix src/frontend run test:run
```

## Acceptance Evidence

Implemented and validated on 2026-06-11:

- `npm run lint` passed.
- `npm run test:run` passed 24 frontend tests.
- `npm run build` passed with the existing third-party SignalR/Rolldown pure
  annotation warnings.
- `npx playwright test e2e/habit-sync.spec.js` passed:
  - registered and verified a learner;
  - created a Habit through the API;
  - opened Habit in two authenticated tabs;
  - moved the receiving tab to Countdown;
  - toggled today's Habit cell in the first tab;
  - observed the receiving tab refetch inactive Habit list and month entries
    after `HabitChecked`;
  - returned to Habit in the receiving tab and saw the checked state.
