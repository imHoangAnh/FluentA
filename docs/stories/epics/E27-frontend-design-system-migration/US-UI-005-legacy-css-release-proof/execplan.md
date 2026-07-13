# US-UI-005 Exec Plan

## Goal

Retire the temporary legacy-style bridge and close E27 with full Chromium,
documentation, and Harness proof while preserving every approved product
contract.

## Risk Classification

Lane: high-risk.

Risk flags:

- initiative-wide style deletion can affect every route at once;
- global selectors may hide semantic, focus, editor, form, or overflow
  dependencies;
- Preflight changes native element defaults;
- route-smoke coverage must include nested and parameterized paths;
- visual proof must complement, not replace, behavior proof;
- current E27 Harness/story states are not fully reconciled;
- baseline unit/lint/build findings cross story ownership boundaries.

## Dependency-Ordered Phases

1. **Confirm milestone gate and freeze baseline**
   - Verify `US-UI-004` implementation proof and user approval.
   - Record clean/dirty worktree, E27 matrix rows, protected/public route map,
     current CSS imports/rule counts, inline styles, production bundle output,
     focused/full test results, and deterministic route screenshots.
   - Stop if any earlier story lacks enough evidence to distinguish cleanup
     regression from an existing defect.
2. **Build the active-consumer inventory**
   - Map CSS files to imports, selectors to JSX/HTML consumers, legacy tokens
     to declarations/usages, and inline styles to fixed/computed categories.
   - Create the final semantic-base and computed-inline allowlists.
   - Assign each unresolved finding to an E27 owning story before deletion.
3. **Retire route styles in bounded groups**
   - Remove any remaining Notes/Dashboard dependency first, then Countdown and
     Pomodoro route CSS, migrating required rules to utilities or shared
     semantic components.
   - Run each owning route's unit/lint/build/E2E/viewport proof immediately
     after its stylesheet is removed.
4. **Retire the global legacy bridge**
   - Move only required semantic base rules into `design-system.css`.
   - Remove the `styles.css` import and delete the file after a zero-consumer
     scan and full route-smoke pass.
   - Remove old token aliases and import-order assumptions.
5. **Resolve inline presentation and Preflight**
   - Remove fixed inline presentation and convert computed values to CSS custom
     property boundaries where practical.
   - Test Preflight on the full route manifest. Keep or reject it based on
     behavior, accessibility, and desktop/tablet evidence; record the decision.
6. **Run full route and behavior regression**
   - Run all frontend units, lint, production build, existing focused E27
     Playwright scenarios, data-driven public/protected route smoke, keyboard,
     reduced-motion, and 1440/1024 overflow screenshots.
   - Exercise representative create/edit/delete/upload/timer/realtime/editor
     behavior; route reachability alone is insufficient.
7. **Bundle and source closeout**
   - Compare final production JS/CSS/font artifacts with the recorded bridge
     baseline and explain material deltas.
   - Run searches for removed imports/selectors, duplicate navigation, raw
     legacy tokens, presentation inline styles, and stale E27 language.
8. **Documentation and Harness reconciliation**
   - Update ADR 0046, architecture/product docs where necessary, story map, and
     all five E27 validation packets.
   - Review `US-UI-001` and `US-UI-002` evidence and close or report their exact
     remaining gaps; do not promote them mechanically.
   - Update `US-UI-005` proof flags only after commands and durable evidence
     exist, record the final trace, and mark E27 complete only when all sources
     of truth agree.

## Concrete Proof Ladder

```powershell
npm.cmd --prefix src/frontend run test:run
npm.cmd --prefix src/frontend run lint
npm.cmd --prefix src/frontend run build
npx.cmd --prefix src/frontend playwright test --workers=1
rg -n "styles\.css|DashboardPage\.css|NotesPage\.css|CountdownPage\.css|PomodoroPage\.css" `
  src/frontend/src
rg -n "dashboard-layout|dashboard-sidebar|workspace-shell|settings-shell|LearningNavLinks" `
  src/frontend/src -g "*.tsx"
rg -n "style=\{\{" src/frontend/src -g "*.tsx"
.\scripts\bin\harness-cli.exe query matrix
git diff --check
```

Supplement the full Playwright run with a data-driven E27 route-manifest spec
at 1440x1000 and 1024x900, a reduced-motion/focus pass, and deterministic
screenshots. Record `dist` asset names/sizes before cleanup and after the final
production build.

## Mechanical Completion Checks

- No superseded CSS import or deleted selector name is present in active source.
- Every remaining inline style appears in the reviewed computed-value allowlist.
- Every public/protected route manifest entry passes at both blocking viewports.
- Full unit, lint, build, and Chromium behavior suites pass.
- ADR 0046 and architecture docs state the final styling/reset boundary.
- All E27 story validation packets and Harness rows agree with actual evidence.
- `git diff --check` passes and no unrelated worktree change is absorbed.

## Stop Conditions

- `US-UI-004` is not approved or an earlier E27 route lacks usable baseline
  evidence.
- Removing a rule changes product behavior and the correct replacement cannot
  be isolated to frontend presentation.
- A required fix reaches API, DTO, schema, authorization, domain, realtime,
  asset, editor-storage, or background-job contracts.
- Enabling Preflight causes regressions that cannot be corrected with a small,
  intentional semantic-base layer; retain the scoped strategy instead.
- Earlier story status/evidence cannot be reconciled from repository truth.

## Rollback Boundary

Each stylesheet removal is a separate proof checkpoint. Route CSS is retired
before the global bridge; the global import is removed only after every route
passes without it. Preflight evaluation is isolated from deletion so it can be
rejected without restoring legacy CSS.
