# Validation

## Proof Strategy

Prove that Settings route ownership moves to the shared shell, `/settings`
redirects to `/settings/profile`, the second-level routes stay protected, and
Level 5 renders inside the shell without changing backend contracts.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | route and shell render coverage for `/settings`, `/settings/profile`, `/settings/review`, `/settings/practice`, and `/settings/level5` |
| Integration | not targeted beyond frontend routing/component integration in this slice |
| E2E | authenticated browser proof that `/settings` redirects and split routes load with active sidebar state |
| Platform | frontend lint and production build |
| Performance | not targeted in this slice |
| Logs/Audit | existing protected-route and request behavior only |

## Fixtures

- Authenticated learner session in frontend route tests.
- Existing mocked settings aggregate payload and Level 5 route data where
  needed for route rendering.

## Commands

```text
npm --prefix src/frontend run lint
npm --prefix src/frontend run test:run -- Settings
npm --prefix src/frontend run build
npm --prefix src/frontend run test:e2e -- learning-navigation.spec.js
.\scripts\bin\harness-cli.exe query matrix
git diff --check
```

## Acceptance Evidence

- Focused Vitest passed for `src/App.test.tsx` and
  `src/routes/settings/SettingsPage.test.tsx`, covering `/settings`
  redirect-to-profile behavior, shared sidebar links, active nav state for
  Profile/Practice/Review/Level 5 routes, and profile save/avatar regression
  behavior.
- Frontend production build passed with the existing Rolldown SignalR
  annotation warnings and chunk-size warning only.
- Global frontend lint is still blocked by a pre-existing
  `react-hooks/set-state-in-effect` error in
  `src/frontend/src/routes/flashcards/ReviewSessionPage.tsx`, outside
  `US-SETTINGS-002`.
