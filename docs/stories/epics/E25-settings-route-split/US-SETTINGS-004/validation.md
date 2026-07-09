# Validation

## Proof Strategy

Prove that Level 5 still works inside the shared Settings shell without
changing its list semantics, and reconcile the final split-route documentation
and matrix evidence.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | shared Settings route rendering plus Level 5 filter/search/single-remove/bulk-remove coverage |
| Integration | React Query cache update proof for Level 5 remove behavior |
| E2E | focused browser proof for Settings routing and Level 5 if the local runtime is available |
| Platform | frontend lint and production build |
| Performance | not targeted in this slice |
| Logs/Audit | existing request/error behavior only |

## Fixtures

- Authenticated learner session in route tests.
- Mocked Level 5 list payload with active and inactive entries.

## Commands

```text
npm --prefix src/frontend run lint
npm --prefix src/frontend run test:run -- src/App.test.tsx src/routes/settings/SettingsPage.test.tsx src/routes/settings/SettingsPracticePage.test.tsx src/routes/settings/SettingsReviewPage.test.tsx src/routes/settings/LevelFiveSettingsPage.test.tsx
npm --prefix src/frontend run build
npm --prefix src/frontend run test:e2e -- learning-navigation.spec.js
.\scripts\bin\harness-cli.exe query matrix
git diff --check
```

## Acceptance Evidence

- Focused Vitest passes for split Settings routes and Level 5 regression
  behavior inside the shared shell.
- Frontend production build passes with only the existing Rolldown SignalR
  annotation warnings and chunk-size warning if it persists.
- Global frontend lint may remain blocked only by the pre-existing
  `react-hooks/set-state-in-effect` error in
  `src/frontend/src/routes/flashcards/ReviewSessionPage.tsx`, outside this
  story.
- Browser proof should be either passed or explicitly documented as blocked by
  local runtime prerequisites.
