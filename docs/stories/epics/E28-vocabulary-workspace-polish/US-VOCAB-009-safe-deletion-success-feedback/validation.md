# US-VOCAB-009 Validation

## Readiness Status

`NOT YET VALIDATED`

## Proof Strategy

Prove accessible overlay/package compatibility and deterministic target/cache
transitions before implementation. Acceptance requires real API-backed browser
evidence because mocked component success alone cannot prove the existing
delete cascade is reached safely.

## Required Baseline

```powershell
dotnet test src/backend/FluentA.Application.UnitTests/FluentA.Application.UnitTests.csproj --filter FullyQualifiedName~VocabularyServiceTests
npm --prefix src/frontend run lint
npm --prefix src/frontend run test:run
npm --prefix src/frontend run build
```

## Acceptance Proof

| Layer | Expected proof |
| --- | --- |
| Unit / component | Context target, accessible dialog, Cancel/Escape, pending guard, endpoint IDs, replacement selection, toast trigger/exclusion matrix. |
| Backend regression | Existing Vocabulary service tests prove owner-scoped Board/Page/Word delete and cleanup behavior. |
| E2E Chromium | Right-click Board/Page, exact modal target, cancel/no-delete, confirm/delete, newest replacement, final empty states, Word modal, create/delete toast placement and dismissal. |
| Accessibility | Menu/dialog roles and names, focus trap/restoration, keyboard cancellation, non-focus-stealing live-region toast behavior. |
| Platform | Dependency inventory, focused lint, frontend tests, production build, bundle output, `git diff --check`. |

## Commands To Refine During Validation

```powershell
npm --prefix src/frontend run test:run -- src/App.test.tsx src/components/vocabulary/VocabTable.test.tsx
npm --prefix src/frontend run test:e2e -- e2e/vocab-workspace-polish.spec.js
```

## Blocking Questions For Validation

- Does the selected toast runtime provide the approved newest-at-bottom order
  and explicit close without a custom global state layer?
- Does Radix context-menu focus restoration remain valid when its trigger is
  removed after a confirmed delete?
- Which React Query update sequence prevents a deleted active Board/Page from
  being briefly reselected by the current default-selection fallback?
