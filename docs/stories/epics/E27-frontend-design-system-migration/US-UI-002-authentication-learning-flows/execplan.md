# US-UI-002 Exec Plan

## Goal

Produce the second user-approved E27 milestone without changing authentication,
learning, backend, API, database, or SRS contracts.

## Risk Classification

Lane: high-risk.

Risk flags:

- public authentication and recovery surfaces;
- protected-route composition and active navigation;
- stateful multi-step Practice and Review sessions;
- Web Speech API and keyboard behavior;
- global/legacy CSS collision and selector drift;
- desktop/tablet visual regression.

## Dependency-Ordered Phases

1. **Baseline and validation readiness**
   - Reconcile `US-UI-001` stale real-E2E route/selector assumptions without
     changing product behavior.
   - Capture current focused auth/learning Vitest, Playwright, lint, build,
     route map, CSS imports, accessible names, and desktop/tablet screenshots.
   - Confirm API/frontend runtime and local email provider proof path.
2. **Complete the minimum shared primitive set**
   - Add only Label/Alert/Progress and Radix-backed dialog/select/radio
     primitives actually consumed by the screens.
   - Add variants through cva and compose classes with `cn`.
3. **Migrate authentication**
   - Rebuild AuthShell and TextField.
   - Migrate Login, Register, Verify Email, Forgot Password, Reset Password,
     and Google Callback while preserving route state and server error mapping.
   - Run focused auth unit/E2E proof before continuing.
4. **Migrate Flashcard selection and viewer**
   - Replace duplicate/legacy layout with AppShell and shared deck/viewer
     presentation.
   - Prove grouping, empty/error/loading, flip, paging, final actions, ownership,
     and realtime refresh.
5. **Migrate Practice**
   - Recompose selection, progress, answer, speech, reveal, recap, and summary
     states without changing progression or persistence ordering.
   - Prove Finish versus Add to Review and abandoned-session behavior.
6. **Migrate Review**
   - Recompose board/mode/order selection, due session, answer recap, summary,
     and resume dialog.
   - Prove immediate persistence, limits/overflow, resume, and SRS transitions.
7. **Remove bounded legacy dependencies**
   - Remove embedded/inline auth presentation and migrated route CSS imports.
   - Search for consumers before deleting any shared selector or component.
8. **Milestone proof and approval**
   - Run focused unit, targeted lint, production build, auth/learning Chromium
     E2E, keyboard/accessibility review, and 1440/1024 screenshots.
   - Record bundle delta and known unrelated failures.
   - Present the running milestone and stop for user approval before
     `US-UI-003`.

## Concrete Proof Ladder

```powershell
npm --prefix src/frontend run test:run
npm --prefix src/frontend run lint
npm --prefix src/frontend run build
npx --prefix src/frontend playwright test `
  e2e/auth-email-verification.spec.js `
  e2e/learning-navigation.spec.js `
  e2e/flashcard-viewer.spec.js `
  e2e/practice-workflow.spec.js `
  e2e/review-workflow.spec.js --project=chromium --workers=1
git diff --check
```

Add focused component tests for new shared primitives and route states rather
than relying only on screenshots. Run deterministic desktop/tablet visual proof
for the auth shell plus each learning workflow state selected in validation.

## Stop Conditions

- Any required change reaches auth/API/schema/cookie/token/email/OAuth/SRS or
  other backend contracts.
- A visual component requires moving Practice/Review domain state out of the
  current route without focused behavioral characterization.
- Existing accessible labels/test IDs cannot be preserved without weakening
  the product contract.
- A required auth or learning behavior is already broken at baseline and the
  repair would exceed presentation scope; document it and request approval.
- `US-UI-001` closeout reveals a P1/P2 AppShell or foundation defect that would
  make new route migration unsafe.

## Rollback Boundary

The story changes frontend composition and styles only. Auth and each learning
workflow are migrated and proven as bounded phases. A failed phase can be
reverted without backend/database rollback, and unmigrated routes retain the
legacy bridge until their own story.
