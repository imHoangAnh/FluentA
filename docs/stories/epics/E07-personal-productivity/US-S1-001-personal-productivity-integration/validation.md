# Validation

## Proof Strategy

Prove the existing backend event remains post-persistence and user-scoped.
Prove every authenticated route can host the listener and that a Todo
completion in one tab refreshes a second Todo tab without reload. Run the
backend/frontend regression ladder and keep S1 docs/Harness evidence current.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | Protected route still renders authenticated children; Todo route remains healthy without local listener. |
| Integration | Existing Todo notifier tests prove completion-only, post-update notification behavior. |
| E2E | Navigate to Todo and Countdown; open a second authenticated tab; complete a Todo and observe the other tab refresh without reload. |
| Platform | Backend tests/build and frontend lint/tests/build pass. |

## Fixtures

- One newly registered and verified learner.
- One Todo task for today.
- Two authenticated browser pages in the same context.

## Commands

```text
dotnet test src/backend/FluentA.slnx --no-restore
dotnet build src/backend/FluentA.API/FluentA.API.csproj --no-restore
npm run lint
npm run test:run
npm run build
npx playwright test e2e/personal-productivity-integration.spec.js --workers=1
```

## Acceptance Evidence

| Requirement | Evidence |
| --- | --- |
| Authenticated-route Todo sync | `ProtectedRoute` owns `useTodoSync`; Todo page no longer creates a route-local duplicate. |
| Cross-tab refresh while another route is visible | Focused Playwright keeps the second tab on Countdown, completes a Todo in the first tab, and proves the second tab performs a background Todo refetch with the completed state. |
| Todo and Countdown navigation | App test and focused Playwright verify both Workspace navigation entries and protected routes. |
| No contract expansion | Existing `/hubs/sync` and `TodoItemChecked` event are reused; no API, schema, or backend source changes. |
| Regression health | Backend/frontend ladder and focused Todo/Countdown/S1 Playwright scenarios pass. |

## Results

- Backend: 77 tests passed (30 domain, 47 application).
- API build: passed with 0 warnings and 0 errors.
- Frontend: lint and 21 tests passed.
- Frontend production build: passed with existing third-party SignalR/Rolldown
  annotation warnings.
- Focused personal-productivity E2E: 4 scenarios passed with no browser console
  errors in the cross-tab integration scenario.
- Review: no P1, P2, or P3 findings.
