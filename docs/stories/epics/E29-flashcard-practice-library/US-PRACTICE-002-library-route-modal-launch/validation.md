# US-PRACTICE-002 Validation

## Readiness Status

`READY WITH CONSTRAINTS` - validated 2026-07-14. Implementation still requires
explicit user approval.

The story is a coherent frontend-only slice. Existing Board/Page Deck and
Practice Settings responses contain all data required for the library and
preparation dialog, and the current session endpoint contains all data required
for direct start. No backend, API, schema, SRS, ownership, or persistence
change is needed.

## Feasibility Matrix

| Assumption | Risk | Evidence | Result |
| --- | --- | --- | --- |
| Existing APIs support the modal and direct session | A new endpoint would expand scope and compatibility risk. | `listBoards()` returns Board -> Page Deck -> `words`; `getPracticeSettings()` returns ordered `modeSequence`; `getPageSession(pageId)` already supplies active-session cards and language. | Ready; reuse unchanged APIs. |
| Query-selected deck can resolve after async loading | The wrong modal could flash or a missing deck could remain selected. | `FlashcardsPage` already receives all Boards and nested Pages in one `['flashcard','boards']` query. The target can be derived only after query success without another request. | Ready; derive from successful query, never from a fallback Page. |
| A standard accessible Dialog fits React 19 | Importing an undeclared transitive package is fragile. | npm registry reports `@radix-ui/react-dialog@1.1.19` peers support React/React DOM through 19. The package is already present transitively in `package-lock.json`, but `npm ls --depth=0` and `package.json` show it is not a direct dependency. | Ready with constraint: add it directly and create a repository-owned wrapper. |
| Auto-start can be stable under Strict Mode | An effect could initialize twice or reshuffle on query rerender. | `main.tsx` mounts the app in `StrictMode`; current `startPractice()` owns all initialization mutations. A ref keyed by normalized `pageId + order`, set before state updates, can guard a single effect after both queries succeed. | Ready with constraint: prove one initialization and stable Shuffle on rerender. |
| Route removal has deterministic behavior | Tests might incorrectly expect a dedicated 404. | `App.tsx` ends with `* -> <Navigate to="/" replace />`. Both removed legacy URLs therefore land at `/`. | Ready; assert the actual wildcard result. |
| Existing workflow E2E can prove preserved Practice rules | A stale fixture could make E29 look broken before reaching the UI. | `practice-workflow.spec.js` posts the old Word payload (`meaningEn`, no required `ipaPronunciation`). Current `WordRequest` requires `ipaPronunciation` and uses optional `definition`; the baseline fails with an empty synchronized Page Deck before Practice navigation. | Ready with constraint: refresh only this fixture to the current accepted Vocabulary contract. |
| Responsive grid is observable | CSS class assertions alone would not prove 5/3/2/1 layout or square cards. | Playwright can compare card bounding boxes/row Y positions at four explicit viewport widths. Tailwind v4 supports an arbitrary small breakpoint plus standard responsive columns. | Ready; require geometric browser assertions. |
| Existing user work can remain isolated | AppShell overlaps E29 while Dashboard changes already break global checks. | Worktree inspection shows pre-existing changes only in AppShell subtitle, Dashboard heading/widget removal, and Workspace description. E29 needs only AppShell Practice route matching. | Ready with constraint: preserve the existing diff and patch only E29-owned AppShell lines. |

## Locked Implementation Constraints

### Dialog dependency and state

- Add `@radix-ui/react-dialog` as a direct dependency at the lockfile-resolved
  compatible version and expose it through a repository-owned `ui/dialog`
  wrapper. Do not import an undeclared transitive dependency and do not reuse
  destructive Alert Dialog semantics.
- Treat a valid, non-empty Page Deck resolved from `/practice?deck=:pageId` as
  the only condition that opens the dialog.
- After the Board query succeeds, normalize an invalid or zero-word `deck`
  query back to `/practice` with replacement navigation. Loading must not clear
  a valid query prematurely.
- Closing, Cancel, or Escape clears `deck`; selecting a new deck starts a fresh
  local order state at Sequential and returns focus to its surviving card.
- Show only configured `modeSequence` names in order. Do not include `recap` as
  a badge because recap is automatic session behavior, not a configurable mode.

### Route-stable session initialization

- Normalize URL order to `shuffle` only for the exact value `shuffle`; missing,
  `sequential`, and invalid values behave as Sequential. Start navigation writes
  the canonical selected value to the URL.
- Wait for both Page Session and Practice Settings success before initializing.
  Loading and either error state must remain explicit.
- Guard initialization with a ref key derived from `pageId` and normalized
  order. Set the ref before calling state setters so Strict Mode's repeated
  effect cannot shuffle twice.
- A normal query refetch or rerender cannot reset current progress. A new route
  component entry or a changed `pageId/order` key may initialize a new session.
- Preserve the existing completion-summary, Finish, per-word Add to Review,
  speech, answer, and recap code paths. `Done` returns to `/practice`.

### Responsive and accessible library

- The route removes only its `max-w-6xl`; it consumes the current AppShell
  content area and does not alter the shared AppShell max-width contract.
- Use base one column, a small arbitrary breakpoint suitable for normal mobile
  two-column display, tablet three columns, and wide desktop five columns.
  Browser proof, not class names, decides acceptance.
- Enabled whole cards use native link/button semantics with Page name and word
  count in the accessible name. Zero-word cards are visibly disabled and
  receive neither viewer navigation nor modal activation.
- Board expansion state remains a set so multiple Boards can be open. A query-
  selected Page Deck may open its modal even when its Board content is currently
  collapsed because the nested query data is already available.

### Test and worktree isolation

- Update all runtime/test references to both removed legacy routes in the same
  story. Historical documentation may retain old endpoint evidence when it is
  clearly historical.
- Refresh `practice-workflow.spec.js` Word creation payload with current
  `ipaPronunciation` and `definition` fields before using it as E29 regression
  proof; do not change the backend to accept the stale fixture.
- Preserve the user's pre-existing AppShell, Dashboard, and Workspace edits.
  Do not repair unrelated Dashboard lint/build errors as part of E29.

## Baseline Evidence

Executed 2026-07-14 from the repository root before production changes:

| Command | Result |
| --- | --- |
| `npm view @radix-ui/react-dialog@latest version peerDependencies --json` | `1.1.19`; React and React DOM peer range includes 19. |
| `npm --prefix src/frontend run test:run` | Passed `40/40` across 10 files. |
| `npm --prefix src/frontend run lint` | Failed only on six unused Dashboard symbols caused by the user's pre-existing commented widget/header edits. |
| `npm --prefix src/frontend run build` | Failed on the same six pre-existing Dashboard unused-symbol TypeScript errors. |
| Focused Playwright: `learning-navigation`, `practice-workflow`, `e27-route-manifest` | IPv4 rerun: learning navigation passed. Desktop/tablet route manifest failed only because the user's Dashboard title is now `Overview` while the test expects `Dashboard Overview`. Practice workflow failed before E29 UI because its stale Word fixture creates zero cards. |
| `git diff --check` | Passed; only existing line-ending warnings were emitted. |

The first Playwright attempt failed with `ERR_CONNECTION_REFUSED` because the
existing Vite process listened only on IPv6 `::1` while Playwright uses
`127.0.0.1`. A temporary IPv4 Vite proof server was started, the focused suite
was rerun, and that proof server was stopped afterward. Implementation browser
proof must bind Vite to `127.0.0.1` explicitly.

## Required Implementation Proof

| Layer | Required proof before closeout |
| --- | --- |
| Unit / component | Shared library/card semantics, Board expansion, zero-word disabled state, query dialog lifecycle, ordered modes, Sequential reset, session order normalization, and one-time initialization. |
| Route / navigation | `/practice` and `/practice/:pageId` resolve; both legacy routes reach the wildcard `/` result; all in-app entries use the new contract. |
| E2E Chromium | External query and refresh open the exact dialog, Cancel clears query, Shuffle survives session refresh, direct active-session start, unchanged completion/Add to Review behavior, and keyboard/focus behavior. |
| Responsive | Wide desktop/tablet/mobile/very-small viewports prove 5/3/2/1 cards per row, square cards, full content width, and no horizontal overflow. |
| Platform | Frontend lint/full tests/build, dependency and bundle review if Dialog package changes, targeted legacy-route `rg`, and `git diff --check`. |

## Implementation Gate

Implementation may begin only after the user explicitly approves
`US-PRACTICE-002`. Stop for renewed approval if work requires an API/schema
change, compatibility redirect, global selection store, active-exercise
redesign, or modification of the user's unrelated Dashboard/Workspace intent.

## Implementation Review - 2026-07-14

### Acceptance Evidence

| Acceptance area | Evidence |
| --- | --- |
| Route cutover | `App.tsx` registers `/practice` and `/practice/:pageId`; legacy routes are absent from runtime source. The wildcard remains `Navigate` to `/`. AppShell navigation and viewer entry use the new URLs. |
| Shared full-width library | `LearningDeckLibrary` supplies the common Board/Page Deck presentation for Flashcards and Practice. Headers show only Board name, deck count, and expand icon; cards contain Page name and word count only. |
| Responsive and empty decks | Card grid uses 5/3/2/1 columns at 1440/1024/375/320 px, keeps cards square, and renders a visible `aria-disabled` zero-word card with no action. |
| Modal-first Practice | `PracticeLaunchDialog` is a repository-owned standard Radix Dialog. It defaults to Sequential per mount, exposes Shuffle, renders only configured ordered mode badges, clears `deck` on Cancel/Escape, and starts `/practice/:pageId?order=...`. |
| Direct, refresh-stable session | `PracticeSessionPage` normalizes order from URL, waits for Page Session and Practice Settings success, and guards initialization with `pageId:order` before state updates so Strict Mode/rerenders cannot reshuffle. The duplicate setup UI and Start action are removed. |
| Accessibility | Whole enabled cards are native links/buttons with labels; empty cards are non-actionable; Board buttons expose `aria-expanded`; Radix Dialog provides labelled modal, focus trap, Escape, and Cancel behavior. |
| Product reconciliation | `docs/product/flashcards.md` and `docs/product/learning-workflows.md` document the library, routes, query target, modal, URL order, and direct start. |

### Commands And Results

| Command | Result |
| --- | --- |
| `npm --prefix src/frontend run test:run` | Passed `40/40` across 10 files. |
| Focused ESLint over all E29 source files | Passed. |
| `npm --prefix src/frontend run test:e2e -- e2e/e29-practice-library.spec.js` | Passed `5/5` mocked-API Chromium scenarios: query-selected modal, Cancel cleanup, Shuffle URL/refresh, legacy wildcard route, zero-word disabled card, 5/3/2/1 grid, square geometry, and horizontal-overflow check. |
| `npm --prefix src/frontend run test:e2e -- e2e/e27-route-manifest.spec.js` | Passed `2/2` mocked-API desktop/tablet route-manifest scenarios after aligning the pre-existing Dashboard title change. |
| `git diff --check` | Passed; only repository line-ending warnings were emitted. |

### Known Constraints And Findings

- No P1 or P2 findings in E29.
- Global frontend lint and production build remain blocked by six unused-symbol
  errors in the user's pre-existing `DashboardPage.tsx` edits. E29 source
  passes focused lint and is not the cause.
- The API-backed `practice-workflow.spec.js` cannot run locally because no API
  listener is available and an attempted local API startup fails because
  PostgreSQL refuses `127.0.0.1:5432`. Its stale Word fixture was refreshed to
  the current `ipaPronunciation`/`definition` contract, but live integration
  proof remains deferred.
- Browser proof uses a temporary Vite server bound to `127.0.0.1`; it was
  stopped after each run. The pre-existing Vite server is IPv6-only (`::1`),
  while Playwright is configured for IPv4.
