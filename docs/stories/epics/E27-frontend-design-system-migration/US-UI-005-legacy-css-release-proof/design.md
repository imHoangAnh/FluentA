# US-UI-005 Design

## Final Styling Boundary

`design-system.css` is the canonical frontend style entrypoint for Tailwind
theme variables, semantic tokens, scoped base behavior, and reduced-motion
rules. Shared UI components and route composition use utilities and
repository-owned variants. No migrated route may depend on the old global
selector vocabulary or an untracked route stylesheet.

This story is deletion-led but proof-gated: inventory consumers first, migrate
the last dependency if one exists, run focused proof, then delete the rule or
file. File size alone is not evidence that a rule is dead.

## CSS Retirement Model

Classify each rule/import into exactly one category:

1. **Superseded presentation** — delete after consumer proof.
2. **Required semantic base** — move to the canonical design-system entrypoint
   with a documented scope and token dependency.
3. **Feature-owned computed visualization** — prefer utilities plus a typed CSS
   custom property; retain minimal CSS only when utilities cannot express the
   behavior safely.
4. **Unresolved consumer** — stop deletion and identify the owning route/test;
   do not retain it silently.

The initial deletion candidates are `styles.css`, `DashboardPage.css`,
`NotesPage.css`, `CountdownPage.css`, and `PomodoroPage.css`. `US-UI-004` should
already retire the Notes dependencies; this story verifies rather than assumes
that result.

## Inline Style Policy

- Remove fixed spacing, color, size, positioning, display, and typography from
  JSX.
- Prefer semantic utility classes for stable presentation.
- Prefer typed CSS custom properties for values calculated in feature code.
- A final allowlist may include only values whose runtime computation is part
  of behavior, such as dynamic Vocabulary column tracks, editor zoom, or
  Pomodoro progress. Each item records file, expression, reason, and proof.
- Hidden native inputs use a reusable visually-hidden class/component rather
  than inline `display: none` when they must remain label-operable.

## Preflight Decision

After the final legacy import is removed, test Tailwind Preflight in an isolated
change across the full route manifest. Enable it only if semantic element
defaults, rich-text content, tables, forms, dialogs, media, and editor output
remain correct. If not, keep Preflight disabled and promote the minimum scoped
base rules in `design-system.css` as the final architecture. Record the result
in ADR 0046; either outcome is valid when backed by proof.

## Route Regression Manifest

Maintain one data-driven Chromium manifest containing:

- public auth routes;
- every protected top-level AppShell route;
- nested Habit Stats and all Settings subroutes;
- Review and page-specific Flashcard/Practice routes;
- expected shell type, stable semantic landmark/heading, active navigation
  target, representative data setup, and supported viewports.

Route reachability smoke does not replace feature behavior suites. It proves
composition/navigation coverage while existing focused scenarios prove domain
behavior.

## Documentation And Harness Reconciliation

- Update ADR 0046 with the final reset/Preflight and CSS-retirement outcome.
- Update `docs/ARCHITECTURE.md` to describe the canonical frontend styling and
  shared shell boundary.
- Remove stale bridge/migration wording from E27 story and product docs only
  where shipped behavior now differs.
- Review every E27 validation packet against current commands and source.
- Update Harness status/proof flags only from durable evidence. In particular,
  reconcile `US-UI-001` and `US-UI-002` independently rather than inferring
  completion from `US-UI-003/004`.

## Accessibility And Responsive Contract

- Visible focus, labels, dialog semantics, keyboard navigation, editor access,
  and non-color feedback must survive removal of global selectors.
- Reduced-motion behavior remains scoped across every AppShell and auth route.
- Blocking viewports are Chromium 1440x1000 and 1024x900. No route may create
  unintended page-level horizontal overflow or hide primary actions.
- Intentional feature-local overflow remains allowed only where documented by
  its story (for example data grids, week/board regions, or editor workspaces).

## Rejected Alternatives

1. Delete CSS by filename and repair screenshots afterward: rejected because
   silent interaction and accessibility dependencies would be lost.
2. Keep global CSS as a permanent fallback: rejected by E27 and ADR 0046.
3. Require zero inline styles without regard to computed behavior: rejected
   because dynamic layout/visual values are legitimate when documented.
4. Mark earlier stories complete because later routes render: rejected because
   Harness proof is story-specific.
5. Use snapshot-only release proof: rejected because reachability, mutation,
   keyboard, and editor behavior require semantic assertions.

## Expected File Areas

- `src/frontend/src/main.tsx`
- `src/frontend/src/design-system.css`
- Superseded global/route CSS files and their remaining consumers
- Shared UI/AppShell components and bounded route cleanup
- `src/frontend/e2e/` route-manifest and release scenarios
- `docs/ARCHITECTURE.md`
- `docs/decisions/0046-frontend-design-system-and-legacy-css-boundary.md`
- All E27 story/validation packets and Harness records
