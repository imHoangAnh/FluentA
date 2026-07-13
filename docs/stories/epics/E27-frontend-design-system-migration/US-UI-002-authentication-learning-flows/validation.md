# US-UI-002 Validation Plan

Date: 2026-07-13

## Status

`IN PROGRESS — IMPLEMENTATION RESUMED BY USER 2026-07-13`

The user resumed the approved `US-UI-002` implementation. AuthShell,
Flashcards, and Flashcard Viewer now use the shared composition and primitives;
Practice and Review presentation migration and full release proof remain open.

## Implementation And Baseline Evidence

| Assumption | Evidence | Result |
| --- | --- | --- |
| Existing route/component behavior has a unit baseline | `npm --prefix src/frontend run test:run` passed 9 files / 36 tests before and after the migration. | READY |
| Auth can migrate without a new form/state library | Routes retain their existing local state, store/API calls, labels, autocomplete values, navigation, and error mappings; only shell and primitives changed. | READY |
| Learning can use one protected navigation shell without state migration | Flashcards, Viewer, Practice, and Review now compose `AppShell`; their query keys, mutations, speech APIs, test ids, and session state remain in their routes. | READY |
| Targeted source stays within the legacy CSS boundary | Changed auth/learning files pass targeted ESLint. A source scan found no embedded AuthShell style block, inline presentation style, `DashboardPage.css` import, `LearningNavLinks`, `dashboard-layout`, or `dashboard-sidebar` in migrated routes. | READY |
| Full frontend build and browser E2E can provide release evidence | Global lint/build currently stop on pre-existing unused `Search` and `Input` imports in `DashboardPage.tsx`. Playwright config defines no `chromium` project, so the planned command cannot select it. | READY WITH CONSTRAINTS |

Review's pre-existing `set-state-in-effect` finding is intentionally scoped to
the active-card reset: clearing the previous answer/transcript as the active
word changes is required behavior. The rationale is kept adjacent to the
single lint suppression; Notes remains unrelated.

## Acceptance Evidence Matrix

| Surface | Required states and interactions | Proof |
| --- | --- | --- |
| AuthShell | Desktop split, tablet compact layout, keyboard order, reduced motion | Chromium screenshots plus keyboard/manual review |
| Login/Register | success, validation error, unverified account, Google unavailable, show/hide password, pending submit | focused component tests plus auth E2E |
| Verify/Forgot/Reset | OTP entry, resend/cooldown, local debug data, unknown email, missing/invalid/single-use reset token | existing API-backed auth E2E plus focused UI tests |
| Google callback | pending, provider/configuration error, successful redirect | deterministic UI tests and existing callback contract tests where available |
| Learning navigation | Flashcard/Practice/Review active states, protected redirect, logout | `learning-navigation.spec.js` plus semantic assertions |
| Flashcard list/viewer | loading, empty, error, grouped pages, flip, previous/next, final actions, realtime refresh | focused tests plus `flashcard-viewer.spec.js` |
| Practice | page selection, sequential/shuffle, each mode, unsupported speech, wrong/reveal/recap, Finish/Add to Review | `practice-workflow.spec.js` and retained focused regression specs |
| Review | board/mode/order selection, no-due, active queue, wrong/correct recap, resume dialog, completion, persistence | `review-workflow.spec.js` and focused SRS regression |
| Viewports | no clipped primary actions or page overflow at 1440x1000 and 1024x900 | deterministic Chromium screenshots and overflow assertions |
| CSS boundary | no embedded AuthShell CSS, inline presentation, duplicated learning sidebar, or migrated route dependency on legacy selectors | source/import/selector search plus visual proof |

## Baseline Commands To Run During Validation

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
```

The validation pass must record exact test counts, build bundle sizes, runtime
ports/provider assumptions, screenshots, and any pre-existing failures before
source implementation.

## Required Manual Checks

- Tab through every auth form; verify focus visibility, error announcement,
  password toggle naming, Enter submission, OTP paste, and disabled pending
  state.
- Operate Flashcard flip/paging and Practice/Review answer flows without a
  mouse where the existing contract supports keyboard input.
- Open and dismiss the Review resume dialog with keyboard only; verify focus
  trap and return.
- Inspect desktop and tablet loading, empty, error, active, recap, and complete
  states in current Chromium.
- Confirm mobile quality and Firefox/WebKit are not used as blocking evidence.

## Known Baseline Items To Reconcile

- Global frontend lint previously reported `react-hooks/set-state-in-effect`
  in `ReviewSessionPage.tsx` and `NotesPage.tsx`. Because Review is now in
  scope, validation must classify and resolve the Review finding before the
  story can complete; Notes remains unrelated unless current evidence changes.
- `US-UI-001` real E2E helpers currently contain stale navigation/selector
  assumptions after the AppShell migration. Reconcile those independently so
  they do not hide regressions in the new milestone.
- Existing production build warnings and the accepted US-UI-001 bundle delta
  must be captured as the comparison baseline, not silently attributed to this
  story.

## Completion Gate

Do not mark `US-UI-002` implemented until:

1. all acceptance criteria have durable evidence;
2. no P1/P2 auth, learning, accessibility, or AppShell finding remains;
3. affected product docs and selector contracts match shipped behavior;
4. Harness numeric proof flags and trace reflect only commands actually run;
5. the user approves the running milestone.
