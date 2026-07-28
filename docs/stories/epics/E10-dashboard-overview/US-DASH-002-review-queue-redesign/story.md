# US-DASH-002 Redesign the Dashboard Review Queue

## Status

implemented

## Lane

normal

## Product Contract

The Dashboard Review Queue makes scheduled review work the primary signal. Its Due Today circle and badge count only overdue words plus words due today; new Learning words remain visible as a separate secondary count and never inflate Due Today.

## Relevant Product Docs

- `docs/product/personal-productivity.md`
- `docs/product/learning-workflows.md`

## Acceptance Criteria

- The Due Today circle and due badge both render `overdue + dueToday` and exclude `newCards`.
- Review and Learning remain separate labeled counts, with Review visually prioritized and Learning presented as secondary context.
- When Review is zero and Learning is greater than zero, the circle and badge remain zero while Learning shows its own count.
- The existing `/review` action, Dashboard query, loading state, responsive layout, and accessible semantics remain intact.

## Design Notes

- Commands: focused Dashboard Vitest, targeted ESLint, production build, focused Dashboard Playwright.
- Queries: Harness intake `#116`.
- API: existing `GET /api/v1/review/dashboard` response is unchanged.
- Tables: unchanged.
- Domain rules: Review queue includes only overdue or due-today words; new words are Learning.
- UI surfaces: Dashboard Review Queue card on `/`.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Dashboard fixtures prove `Review=0, Learning>0` keeps Due Today at zero and populated totals exclude Learning. |
| Integration | Existing ReviewDashboard query and `/review` link remain wired. |
| E2E | Dashboard empty-review state and action remain visible in Chromium. |
| Platform | Targeted ESLint and production build pass. |
| Release | Not required for this bounded presentation change. |

## Harness Delta

No Harness framework change is required.

## Evidence

- Focused Dashboard Vitest: `5/5` passed, including `Review = 0, Learning = 7` and populated `Review = 5, Learning = 4` derivation cases.
- Targeted ESLint for the Dashboard component, unit test, Review Queue E2E, and existing Dashboard E2E: passed.
- Production `npm run build`: passed; existing SignalR/Rolldown pure-annotation warnings remain non-blocking.
- Playwright `e2e/dashboard-review-queue.spec.js`: `1/1` passed with `Review = 0, Learning = 1`, exact Due Today/Review/Learning values, `/review` link, desktop layout, 375px layout, and no document horizontal overflow.
- Harness `story verify US-DASH-002`: passed through the durable `verify.ps1` command (focused Dashboard test plus production build).
- Full frontend Vitest: `118/120` passed. The two failures remain confined to the unrelated in-progress Journal redesign tests expecting `journal-workspace` and `Journal title` elements absent from the current Journal component.
- Full ESLint remains blocked outside this story by the existing restricted Notes-to-Trash deep import, plus one Trash `useMemo` warning.
- Scoped `git diff --check`: passed; Git reported line-ending conversion warnings only.
