# US-UI-005 Overview

## Status

implemented and approved

## Lane

high-risk

## Story Outcome

Close E27 with one active frontend design system: retire superseded global,
route, and inline presentation rules; prove every public and protected route in
blocking Chromium viewports; reconcile documentation, ADR 0046, story packets,
and Harness evidence before marking the initiative complete.

## Current Behavior

- `main.tsx` loads both `design-system.css` and the legacy `styles.css` bridge.
- The current CSS inventory is approximately 8,855 lines: 6,681 global legacy
  lines, 105 design-system lines, and four route files totaling 2,069 lines.
- Active route CSS imports remain for Notes, Countdowns, and Pomodoro; Notes
  also imports `DashboardPage.css`.
- Fourteen inline style sites remain. Some are presentation-only, while others
  are computed values such as Vocabulary grid columns, Journal editor zoom,
  and Pomodoro SVG progress.
- The Harness matrix still reports `US-UI-001` and `US-UI-002` as
  `in_progress`, even though later milestone work exists. Initiative closeout
  cannot claim completion until every E27 story row, packet, and actual proof
  agrees.
- The current global build/lint baseline is blocked by two unused Dashboard
  imports, and Notes has separate unit/lint findings assigned to `US-UI-004`.

## Target Behavior

- `styles.css` and every superseded route stylesheet/import are removed after a
  selector-to-consumer audit proves no active dependency.
- `design-system.css` remains the intentional Tailwind/theme/base entrypoint.
  Any retained authored CSS is minimal, documented, semantic, and not a legacy
  route presentation system.
- Presentation-only inline styles are removed. Each retained computed inline
  value has a documented reason and cannot be expressed more safely through a
  class or CSS custom property boundary.
- Every public and protected route is reachable, shows the correct shell and
  active navigation, and preserves representative behavior in Chromium at
  1440x1000 and 1024x900.
- Full frontend unit, lint, type/build, API-backed regression, keyboard,
  reduced-motion, overflow, source-scan, and bundle checks pass.
- E27 context/approach/story map, ADR 0046, story validation packets, product or
  architecture docs, and Harness rows describe the same shipped state.

## Relevant Contracts

- `docs/stories/epics/E27-frontend-design-system-migration/context.md`
- `docs/stories/epics/E27-frontend-design-system-migration/approach.md`
- `docs/stories/epics/E27-frontend-design-system-migration/story-map.md`
- `docs/decisions/0046-frontend-design-system-and-legacy-css-boundary.md`
- All E27 story overview and validation packets
- `docs/ARCHITECTURE.md`
- Affected `docs/product/*.md` files

## Acceptance Criteria

1. `US-UI-004` is implemented, proven, and user-approved before cleanup begins.
2. A selector/import/inline-style inventory maps every active consumer before
   deletion and records the retained-design-system allowlist.
3. `src/frontend/src/styles.css`, `DashboardPage.css`, `NotesPage.css`,
   `CountdownPage.css`, and `PomodoroPage.css` are deleted or reduced only if an
   explicit active contract requires retention; no superseded import remains.
4. Tailwind semantic tokens and repository-owned shared primitives are the
   single presentation foundation. Legacy color/token aliases and import-order
   coupling are removed.
5. Presentation-only inline styles are eliminated. Computed layout/visual
   values are converted to typed CSS custom properties where practical and
   otherwise appear in a documented final allowlist.
6. Tailwind Preflight is explicitly evaluated after all routes migrate. It is
   enabled only if full proof shows no behavior/visual regression; otherwise
   the scoped `.ds-root` base strategy remains documented as the final choice.
7. A protected-route manifest proves Dashboard, Vocabulary, Todo, Countdowns,
   Flashcards, Practice, Habits/Stats, Journal, Notes, Kanban, Pomodoro,
   Notifications, Settings subroutes, Review, and page-specific practice routes
   are reachable with correct active shell/navigation behavior.
8. Public authentication routes remain reachable and preserve the separate
   auth shell and approved Login/Register presentation.
9. Full unit, lint, build, focused API-backed E2E, protected-route smoke,
   desktop/tablet responsive, keyboard/focus, reduced-motion, and source scans
   pass in blocking Chromium.
10. Production output records JavaScript/CSS/font assets and compares the final
    CSS/bundle footprint with the bridge baseline; unexplained duplicated style
    payload is not accepted.
11. No API, DTO, database, authorization, domain, realtime, asset, editor, or
    background-job contract changes are introduced during cleanup.
12. All five E27 Harness rows have evidence-backed status/proof flags that
    match their validation packets. Earlier `in_progress` rows are reviewed,
    not mechanically promoted from later-story existence.
13. ADR 0046 records the final Preflight/base/reset and legacy-retirement
    outcome; architecture/product/story docs contain no stale coexistence or
    deferred-migration language.
14. A targeted source search finds no obsolete shell selectors, duplicated
    navigation, removed CSS imports, old token usage, or stale E27 references.

## Non-Goals

- New visual redesign beyond consistency fixes required by CSS retirement.
- New product features, mobile-specific quality, dark mode, or Firefox/WebKit
  remediation.
- Broad performance optimization unrelated to duplicated design-system/legacy
  payload.
- Changing backend/API/database/domain contracts to make frontend regression
  tests easier.

## Dependencies And Gate

- E27 decisions D1-D14 and ADR 0046 remain authoritative.
- `US-UI-001` through `US-UI-004` must have route-level implementation and
  approval evidence available for reconciliation.
- `US-UI-004` approval is the hard start gate.
- E27 is not complete until the final route proof, CSS audit, documentation,
  and Harness matrix all agree.
