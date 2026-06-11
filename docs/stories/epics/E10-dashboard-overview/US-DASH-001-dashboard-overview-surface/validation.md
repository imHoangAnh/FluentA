# Validation

## Proof Strategy

Prove Dashboard route rendering and query-key wiring with Vitest first, then
run lint/build. Finish with a focused Playwright smoke that registers a learner,
creates Todo/Habit/Countdown data through the UI/API, lands on `/`, and verifies
the dashboard widgets and quick toggles.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit/component | `/` renders Dashboard for authenticated users; `/vocabulary` renders the previous workspace; widgets show cached Todo/Habit/Countdown/Flashcard data; quick links are present. |
| Integration | Todo and Habit quick toggles call existing APIs and invalidate dashboard/domain queries. |
| E2E | Authenticated learner sees Dashboard by default, toggles Todo/Habit from Dashboard, sees Countdown and Flashcard widgets, and can open Vocabulary. |
| Platform | Frontend lint, tests, build, and focused Playwright pass. |
| Performance | Dashboard uses bounded existing list calls and limits visible Todo/Habit/Countdown rows. |

## Fixtures

- One verified learner.
- One Todo item for today.
- One daily Habit.
- One upcoming Countdown.
- Flashcard dashboard may be empty; the widget must still render an empty state.

## Commands

Expected after implementation:

```text
npm --prefix src/frontend run lint
npm --prefix src/frontend run test:run
npm --prefix src/frontend run build
npx playwright test e2e/dashboard-overview.spec.js
.\scripts\bin\harness-cli.exe story verify US-DASH-001
```

## Acceptance Evidence

Passed on 2026-06-11:

- `npm --prefix src/frontend run lint` passed.
- `npm --prefix src/frontend run test:run` passed: 3 test files, 27 tests.
- `npm --prefix src/frontend run build` passed. Vite emitted the known
  third-party SignalR/Rolldown pure annotation warning.
- `npx playwright test e2e/dashboard-overview.spec.js` passed: authenticated
  learner landed on Dashboard by default, opened Vocabulary, saw seeded Todo,
  Habit, Countdown, and empty Flashcard widgets, toggled Todo/Habit from
  Dashboard, and verified persisted completion through the API.
- `.\scripts\bin\harness-cli.exe story verify US-DASH-001` passed by running
  `npm --prefix src/frontend run test:run`.
