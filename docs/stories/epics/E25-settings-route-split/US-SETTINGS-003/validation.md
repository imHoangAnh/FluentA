# Validation

## Proof Strategy

Prove that split Practice and Review routes no longer autosave on edit, save
only on explicit action, preserve local drafts on failure, and keep the shared
Settings shell contract intact.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | route-local draft, explicit save, success, and error coverage for Practice and Review |
| Integration | React Query cache update proof through route component tests |
| E2E | not targeted unless focused route tests leave a meaningful gap |
| Platform | frontend lint and production build |
| Performance | not targeted in this slice |
| Logs/Audit | existing request/error behavior only |

## Fixtures

- Authenticated learner session in frontend route tests.
- Mocked Practice and Review settings API payloads and mutation responses.

## Commands

```text
npm --prefix src/frontend run lint
npm --prefix src/frontend run test:run -- src/App.test.tsx src/routes/settings/SettingsPage.test.tsx src/routes/settings/SettingsPracticePage.test.tsx src/routes/settings/SettingsReviewPage.test.tsx
npm --prefix src/frontend run build
.\scripts\bin\harness-cli.exe query matrix
git diff --check
```

## Acceptance Evidence

- Focused Vitest passes for split Settings routes and explicit-save behavior on
  Practice and Review.
- Frontend production build passes with only the existing Rolldown SignalR
  annotation warnings and chunk-size warning if it persists.
- Global frontend lint may remain blocked only by the pre-existing
  `react-hooks/set-state-in-effect` error in
  `src/frontend/src/routes/flashcards/ReviewSessionPage.tsx`, outside this
  story.
