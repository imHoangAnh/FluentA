# US-UI-001 Validation

## Proof Strategy

Baseline the current frontend, prove dependency/toolchain and CSS coexistence,
then verify the first migrated milestone at component, route, behavior, build,
Chromium, accessibility, and desktop/tablet viewport layers. Visual polish
alone is insufficient: Dashboard actions and Vocabulary autosave/keyboard
contracts must continue to work.

## Test Plan

| Layer | Cases |
| --- | --- |
| Static | TypeScript production build, ESLint, no invalid Tailwind composition, no legacy Dashboard/Vocabulary stylesheet dependency. |
| Unit / Component | Primitive variants and disabled/focus states; AppShell active navigation/collapse; Dashboard loading/empty/error/data states; Vocabulary existing focused tests. |
| Route | Protected routes remain protected and reachable through AppShell; auth routes remain outside AppShell. |
| E2E Chromium | Dashboard overview; Vocabulary board/page CRUD, column configuration, autosave, keyboard navigation, and multilingual behavior. |
| Accessibility | Keyboard traversal, visible focus, labels/names, dialog/dropdown focus handling, reduced-motion behavior. |
| Viewport | Chrome/Edge-compatible checks at one locked tablet width and at least 1024px/1440px desktop widths. |
| Performance | Record production bundle output and compare against baseline; investigate material unexpected growth. |

## Baseline Commands

```powershell
npm --prefix src/frontend run lint
npm --prefix src/frontend run test:run
npm --prefix src/frontend run build
npm --prefix src/frontend exec playwright test --project=chromium e2e/dashboard-overview.spec.js
npm --prefix src/frontend exec playwright test --project=chromium e2e/vocab-smoke.spec.js e2e/vocab-column-configuration.spec.js e2e/vocab-spreadsheet-autosave.spec.js e2e/vocab-multilanguage.spec.js
```

Exact Playwright invocation and viewport proof may be refined during validation
after checking the current config and available local runtime.

## Readiness Evidence Required Before Implementation

- Current build/test baseline and unrelated failures recorded.
- Tailwind/shadcn integration confirmed against the installed React/Vite stack.
- CSS layer/import strategy demonstrated without changing an unmigrated route.
- Existing Dashboard and Vocabulary behavior selectors mapped so test updates
  do not weaken assertions.
- AppShell route composition approach proven compatible with protected routes.

## Acceptance Evidence To Capture

- Passed focused tests and production build.
- Chromium screenshots or equivalent running-app review at desktop/tablet.
- Passed Dashboard and Vocabulary behavior scenarios.
- Keyboard/focus and reduced-motion observations.
- Bundle comparison and remaining legacy CSS inventory.
- Explicit user approval of milestone 1.

## Implementation Evidence Captured

- Added Tailwind CSS `4.3.2` through the Vite plugin without Preflight, scoped
  semantic light-theme tokens under `.ds-root`, and bundled Geist Sans
  Variable locally through `@fontsource-variable/geist`.
- Added repository-owned shadcn-style Button, Card, Badge, Input, and Skeleton
  primitives using cva, clsx, and tailwind-merge. Accessible menu behavior uses
  the focused `@radix-ui/react-dropdown-menu` package.
- Added the shared desktop/tablet AppShell with a full desktop sidebar and
  icon-only sidebar at widths up to 1100px.
- Dashboard and Vocabulary no longer import their route stylesheets. The old
  Dashboard stylesheet remains temporarily because unmigrated Flashcard, Todo,
  and Notes routes still import it; `US-UI-005` owns final deletion.
- `npm --prefix src/frontend run test:run`: PASS, 9 files and 36 tests.
- Focused ESLint over AppShell, UI primitives, Vocabulary components, Dashboard,
  and Workspace: PASS. Full lint still reports only the two recorded baseline
  errors in Review and Notes.
- `npm --prefix src/frontend run build`: PASS with the existing SignalR
  annotation and chunk-size warnings.
- Post-change bundle: CSS `148.57 kB` (`26.25 kB` gzip) and main JS
  `703.43 kB` (`204.10 kB` gzip). The temporary coexistence delta is
  `+22.05 kB` CSS (`+4.83 kB` gzip) and `+118.46 kB` JS (`+38.32 kB` gzip).
- `npm audit fix` applied patch-compatible transitive updates for existing
  axios/jsdom dependency chains; `npm audit` now reports zero vulnerabilities.
- `e2e/design-system-milestone.spec.js`: PASS, two deterministic Chromium
  scenarios covering AppShell, Dashboard, and Vocabulary at 1440x1000 and
  1024x900, with four screenshots visually reviewed.
- Real Dashboard/Vocabulary E2E remains blocked before feature assertions
  because the backend currently fails to build at
  `NoteService.cs:190`: `INoteRepository` has no
  `IsAssetReferencedAsync` member. This backend failure is unrelated and was
  not modified in `US-UI-001`.

## Milestone Approval

`PENDING USER VISUAL APPROVAL`

## Reality Gate

```text
REALITY GATE REPORT
Mode: high_risk_feature
Current work: Deliver Foundation, AppShell, Dashboard, and Vocabulary as the first approved E27 milestone.
MODE FIT: PASS
REPO FIT: PASS
ASSUMPTIONS: PASS WITH CONSTRAINTS
SMALLER PATH: PASS
PROOF SURFACE: PASS WITH CONSTRAINTS
Decision: READY WITH CONSTRAINTS
```

## Feasibility Matrix

| Assumption | Risk | Evidence | Result |
| --- | --- | --- | --- |
| Tailwind can integrate with the installed Vite runtime | Low | Repo uses Vite `8.0.16`; `@tailwindcss/vite@4.3.2` declares Vite `^5.2 || ^6 || ^7 || ^8`; official Tailwind guidance uses the Vite plugin. | PASS |
| shadcn can initialize in the existing React/Vite app | Low | Official shadcn Vite guidance covers existing projects and the Vite plugin/alias shape; Node `24.15.0` exceeds shadcn `>=20.18.1`. | PASS |
| Radix primitives support the installed React version | Low | `radix-ui@1.6.2` peer dependencies include React and React DOM 19; official docs support incremental adoption and tree shaking. | PASS |
| Legacy CSS can coexist without globally restyling unmigrated routes | High | Tailwind documents that Preflight globally resets margins, borders, headings, lists, and media. Tailwind also documents importing theme/utilities separately while omitting Preflight. | PASS WITH CONSTRAINT: omit Preflight in `US-UI-001`; add only intentional base rules and reconsider after full migration. |
| AppShell extraction fits current route architecture | Medium | `App.tsx` centrally owns protected routes; navigation/shell markup or `LearningNavLinks` appears across Dashboard plus at least ten protected feature files. | PASS |
| Dashboard/Vocabulary behavior has durable selectors | Medium | Focused E2E predominantly uses roles, labels, and test IDs; `VocabTable.test.tsx` covers autosave, retry, Enter/Tab behavior, wide scrolling, and resize handles. | PASS WITH CONSTRAINT: preserve accessible names and stable test IDs; replace only presentation-coupled selectors. |
| Current frontend baseline is green | Medium | Vitest passed 9 files/36 tests and production build passed. ESLint has two pre-existing `react-hooks/set-state-in-effect` failures outside current route bodies. Focused E2E is blocked in registration by an ambiguous `Password` locator matching the input and `Show password` button. | PASS WITH CONSTRAINTS: record baseline failures and repair the E2E helper selector without weakening downstream assertions. |
| Local runtime can execute browser proof | Low | API is listening on port 5000 and Vite on 5173; Playwright launched five focused scenarios and reached the registration UI. | PASS |

## Baseline Evidence Captured

- Runtime versions: Node `24.15.0`, npm `11.16.0`, React `19.2.7`,
  TypeScript `6.0.3`, and Vite `8.0.16`.
- `npm --prefix src/frontend run test:run`: PASS, 9 files and 36 tests.
- `npm --prefix src/frontend run build`: PASS; baseline output includes
  `126.52 kB` CSS (`21.42 kB` gzip) and `584.97 kB` main JS
  (`165.78 kB` gzip), with existing SignalR pure-annotation and chunk-size
  warnings.
- `npm --prefix src/frontend run lint`: FAIL on two pre-existing files outside
  the current Dashboard/Vocabulary bodies:
  `ReviewSessionPage.tsx:127` and `NotesPage.tsx:102`.
- Focused Playwright launched against the healthy local API/frontend but all
  five scenarios stopped at their shared registration helper because
  `getByLabel('Password')` matches both the password textbox and the
  `Show password` button. No Dashboard/Vocabulary assertion ran.
- The target tests use accessible roles/labels and stable test IDs for the
  majority of their contracts, so the redesign does not require CSS-class
  selectors as its primary proof surface.

## Execution Constraints

1. Do not enable Tailwind Preflight while legacy route CSS remains. Import the
   Tailwind theme and utilities layers explicitly and retain only intentional
   global base rules.
2. Fix the focused E2E registration helper to target the password textbox
   exactly before treating browser evidence as green. Preserve the downstream
   Dashboard/Vocabulary assertions.
3. Treat the two lint errors and existing build warnings as baseline debt; do
   not claim they were introduced by `US-UI-001`, and do not broaden the story
   to fix Review or Notes behavior.
4. Preserve Vocabulary labels, test IDs, autosave ordering, keyboard movement,
   retry behavior, wide-table scrolling, and resize handles.
5. Record CSS and JS bundle output after implementation against this baseline.
6. Present the running desktop/tablet milestone to the user before beginning
   `US-UI-002`.

## Current Readiness

`READY WITH CONSTRAINTS`
