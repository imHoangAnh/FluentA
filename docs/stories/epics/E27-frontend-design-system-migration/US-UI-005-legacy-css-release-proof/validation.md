# US-UI-005 Validation Plan

Date: 2026-07-13

## Status

`PLANNED — BLOCKED ON US-UI-004 APPROVAL`

This file records planning readiness and the observed bridge baseline only. It
is not release evidence, and no Harness proof flag should be set from it.

## Bridge Baseline

| Area | Observed state | Required closeout |
| --- | --- | --- |
| Global entry | `main.tsx` imports `design-system.css` and `styles.css` | One canonical design-system entry; no legacy bridge import. |
| Global legacy CSS | `styles.css`: 6,681 lines, approximately 1,154 class-rule starts | Delete after selector/consumer proof or justify any semantic rule moved to the canonical entry. |
| Route CSS | Dashboard 637, Notes 372, Countdown 604, Pomodoro 456 lines | Retire all superseded imports/rules through route-bounded proof. |
| Inline styles | 14 JSX sites | Remove fixed presentation; allowlist only computed behavior values. |
| Preflight | intentionally disabled under ADR 0046 | Evaluate after migration and record the final reset/base decision. |
| Full unit | 34 passed, 2 Notes failed | `US-UI-004` owns the Notes repair; final suite must be green. |
| Full lint | two Dashboard unused imports plus one Notes effect finding | Reconcile owning stories; final lint must be green. |
| Full build | blocked by two Dashboard unused imports | Final production build and bundle comparison must pass. |
| E27 matrix | UI-001/UI-002 `in_progress`, UI-003 implemented, UI-004/UI-005 planned | Review proof story by story before initiative closeout. |

Current CSS total is approximately 8,855 lines across the canonical entry,
legacy global file, and four route files. This is an inventory baseline, not a
target percentage: completion is based on active contracts and zero superseded
dependencies.

## Required Proof Matrix

| Layer | Required proof before completion |
| --- | --- |
| Unit | Entire frontend unit suite passes after CSS/import deletion. |
| Integration | Representative API-backed owner-scoped mutations, uploads, editor persistence, timers, and realtime flows remain intact. |
| E2E | Full Chromium suite plus a complete public/protected route manifest passes. |
| Platform | Lint, production build, bundle comparison, desktop/tablet overflow, keyboard/focus, reduced motion, and source scans pass. |
| Release | ADR/docs/story packets/Harness matrix agree; each earlier E27 milestone has independently reviewed evidence. |

## Required Route Manifest

- Public: Login, Register, Verify Email, Forgot Password, Reset Password, and
  Google callback handling.
- Protected top level: Dashboard, Vocabulary, Todo, Countdowns, Flashcards,
  Practice, Habits, Journal, Notes, Kanban, Pomodoro, Notifications, Settings,
  Review.
- Nested/parameterized: Habit Stats, Settings Profile/Practice/Review/Level 5,
  Flashcard page, and page Practice.
- For each: expected shell, landmark/heading, active navigation, authentication
  behavior, 1440x1000 overflow, and 1024x900 overflow.

## Required Source Evidence

- CSS import graph before and after cleanup.
- Selector-consumer inventory with deletion or retained-semantic disposition.
- Inline-style inventory with a zero fixed-presentation result and documented
  computed-value allowlist.
- Search for old shell/navigation selectors and legacy token aliases.
- Production `dist` JS/CSS/font asset names and sizes before and after cleanup.
- Deterministic desktop/tablet screenshot index for representative route states.

## Known Gaps Before Implementation

- `US-UI-004` is not yet implemented or approved.
- Current full unit/lint/build baselines are not green.
- Earlier E27 Harness rows and validation packets require independent
  reconciliation.
- The final Preflight decision cannot be made until the last legacy route is
  migrated.

## Completion Gate

Do not mark `US-UI-005` or E27 complete from file deletion alone. Completion
requires green behavior and platform proof, reviewed documentation, final
route screenshots, a reconciled matrix, and no open P1/P2 migration finding.
