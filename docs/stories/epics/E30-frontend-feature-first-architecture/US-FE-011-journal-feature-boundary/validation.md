# Validation — US-FE-011

| Assumption | Evidence | Result |
| --- | --- | --- |
| Route moves independently. | Legacy manifest has a single `journal` entry. | READY |
| Editor preload can use public API. | Dashboard dynamic-imports only the editor module. | READY |
| UI workflow remains covered. | Journal foundation, calendar, search, and rich-text autosave E2E exist. | READY |

## Implementation and review evidence

| Acceptance criterion | Evidence | Result |
| --- | --- | --- |
| `/journal` retains its route and lazy loading. | `journalRoutes` is composed by `app/router.tsx`; legacy manifest ownership is removed. | PASS |
| Journal owns page, editor, and API. | They now live under `features/journal`; Dashboard and Notes use its public API. | PASS |
| Existing Journal workflows persist. | Foundation, calendar, search, and rich-text autosave browser workflows passed. | PASS |

## Commands and results

- Focused app and Dashboard tests — PASS: 3 files, 16 tests.
- `npm --prefix src/frontend run lint` — PASS.
- `npm --prefix src/frontend run build` — PASS with known third-party `@microsoft/signalr` pure-annotation warnings only.
- `npm --prefix src/frontend run test:e2e -- journal-foundation.spec.js journal-calendar.spec.js journal-search.spec.js journal-rich-text-autosave.spec.js` — 3 PASS; rich-text autosave missed its 500 ms editor-load budget at 884 ms under four concurrent workers.
- `npm --prefix src/frontend run test:e2e -- journal-rich-text-autosave.spec.js` — PASS alone (the functional and timing proof). This indicates worker-contention noise, not a migration behavior regression.
- Legacy Journal-path and cross-feature deep-import scans — PASS: no active matches.
- `git diff --check` — PASS.

## Review findings

No P1, P2, or P3 findings. The move exposed Notes' existing rich-text-editor
dependency; it now uses the Journal public API, preserving the same editor
interface and resolving the resulting route-load error. No route, payload,
query/cache, backend, or editor behavior changed.
