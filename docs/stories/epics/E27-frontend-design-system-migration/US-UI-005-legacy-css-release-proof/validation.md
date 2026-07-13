# US-UI-005 Validation Evidence

Date: 2026-07-13

## Status

`IMPLEMENTED AND APPROVED`

## Release Outcome

- `design-system.css` is the only application CSS entrypoint.
- Tailwind Preflight is enabled and the scoped focus/reduced-motion contract is
  retained.
- `styles.css`, `DashboardPage.css`, `NotesPage.css`, `CountdownPage.css`, and
  `PomodoroPage.css` are deleted with zero active imports.
- Active authored rules were consumer-pruned and generic legacy token aliases
  were replaced with semantic `--ds-*` tokens.
- Habit Stats now uses AppShell. Page-specific Practice marks only Practice as
  active. Dashboard widget visibility was restored from the product contract
  and persists in `dashboard-visible-widgets`.

## Proof Matrix

| Layer | Result | Evidence |
| --- | --- | --- |
| Unit | pass | Vitest: 9 files, 36/36 tests. |
| Integration | pass | Blocking browser proof includes owner-scoped Notes and Notifications, Journal CRUD, Settings persistence, Countdown CRUD, Pomodoro task linking, and Habit statistics. |
| E2E | pass | Blocking E27 Chromium release set: 15/15 scenarios. The data-driven manifest covers all 6 public routes and 20 protected/nested/parameterized routes at both viewports. |
| Platform | pass | ESLint, TypeScript, Vite build, source scans, focus, reduced motion, desktop/tablet overflow, and `git diff --check` pass. |

## Commands And Exact Results

```text
vitest run
9 files passed; 36 tests passed

eslint .
passed

tsc -b && vite build
passed

playwright blocking E27 release set --workers=1
15 tests passed
```

Focused retirement checkpoints also passed 9/9 for Countdown, Pomodoro, Habit
Stats, productivity responsiveness, and the route manifest. US-UI-004's
content/account set passed 10/10 before cleanup.

## Bundle Comparison

| Asset | Bridge baseline | Final | Delta |
| --- | ---: | ---: | ---: |
| CSS | 147.09 kB | 104.66 kB | -42.43 kB (-28.8%) |
| CSS gzip | 25.78 kB | 18.41 kB | -7.37 kB (-28.6%) |
| Main JS | 688.17 kB | 689.19 kB | +1.02 kB |
| Main JS gzip | 203.74 kB | 204.14 kB | +0.40 kB |

The small JS delta is the restored Dashboard widget settings and explicit
active-navigation mapping. Existing SignalR pure-annotation and bundle-size
advisories remain non-blocking.

## Inline Computed Allowlist

- `VocabTable.tsx`: sortable column width, transform, transition, and drag
  opacity are runtime DnD state.
- `VocabTable.tsx`: three `gridTemplateColumns` values are user-resizable
  runtime column tracks.
- `JournalRichTextEditor.tsx`: `--journal-editor-zoom` is the user-selected
  editor scale.
- `PomodoroPage.tsx`: `strokeDashoffset` is calculated timer progress.

No fixed spacing, color, display, positioning, or typography inline rule
remains.

## Historical Suite Reconciliation

The monolithic historical Playwright command was also attempted. Several
pre-E27 specs still encode superseded setup assumptions such as `/` opening
Vocabulary, non-nested Settings, removed flashcard-deck endpoints, or old
presentation headings. The release set replaces those presentation-coupled
assumptions with semantic route and current API-backed behavior proof; no
failure reproduced in the blocking E27 set.

## Source Closeout

- No removed stylesheet import or obsolete shell selector remains.
- `LearningNavLinks.tsx` was deleted after a zero-consumer scan.
- Public auth routes remain outside AppShell; every protected manifest route
  renders AppShell with correct navigation.
- ADR 0046, architecture, E27 context/approach/story map, and Harness rows are
  reconciled to the shipped state.
