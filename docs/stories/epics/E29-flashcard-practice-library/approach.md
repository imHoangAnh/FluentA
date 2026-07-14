# E29 Flashcard And Practice Library Approach

## Recommended Path

Deliver the approved change as one normal-risk frontend story:

1. `US-PRACTICE-002` replaces the Practice library and session routes, gives
   Flashcards and Practice one full-width Board/Page Deck presentation, adds a
   query-driven preparation dialog, and starts the selected session directly
   from that dialog.

These behaviors form one observable journey: choose Practice, choose a Page
Deck, confirm order and configured modes, then enter the active session. Route
cutover without the modal or modal launch without session auto-start would
leave an incomplete user-visible state.

## Implementation Shape

1. Keep `FlashcardsPage` as the route boundary and extract the repeated Board
   header and Page Deck grid into a small shared learning-library component.
   The component receives the destination behavior: viewer navigation for
   Flashcards and modal selection for Practice.
2. Add a repository-owned general Dialog wrapper using the existing Radix
   composition style. Do not reuse the destructive Alert Dialog primitive for
   a reversible preparation task.
3. Treat `/practice?deck=:pageId` as the modal selection source of truth.
   Resolve the Page Deck from loaded Board data, open the dialog when it is a
   valid non-empty deck, and remove the query on Cancel or close.
4. Keep Sequential/Shuffle local to each dialog opening and reset to
   Sequential whenever a new Page Deck is selected. Load global Practice
   settings through the existing API and render the ordered mode names only.
5. `Start Practice` navigates to `/practice/:pageId?order=sequential|shuffle`.
   `PracticeSessionPage` normalizes missing or invalid order to Sequential and
   initializes the current active session only after cards and settings are
   ready. Shuffle exactly once for the route entry, not on rerender.
6. Remove both legacy Practice routes from the route manifest and update every
   in-app Practice link and route-level test in the same change. The existing
   wildcard behavior sends those removed URLs to `/`; no compatibility
   redirect is added.

## Why This Boundary

- Flashcards and Practice share presentation but retain different card actions.
- URL-owned modal selection makes external navigation and browser refresh
  deterministic without introducing global client state.
- URL-owned order preserves refresh behavior while the existing Practice API,
  settings, summaries, scoring, and SRS rules remain unchanged.
- The active exercise UI and Flashcard viewer stay outside the redesign, as
  approved in D13.

## Rejected Alternatives

1. **Retain legacy routes as aliases or redirects.** Rejected by D1 and D14;
   both old URLs must use the current wildcard behavior.
2. **Store the selected deck only in router state or component state.**
   Rejected because refresh and external Practice actions would lose D15.
3. **Maintain separate Flashcards and Practice library markup.** Rejected
   because the approved Board/grid/card presentation is identical and would
   drift across two copies.
4. **Reuse `AlertDialog` for preparation.** Rejected because choosing order and
   starting a session is not destructive and should use standard Dialog
   semantics.
5. **Keep a second setup screen inside `PracticeSessionPage`.** Rejected by D9;
   it would make the modal choice non-authoritative and require a duplicate
   Start action.
6. **Persist the last chosen order globally.** Rejected by D7 and the feature
   boundary; each newly opened modal starts at Sequential.

## Integration Boundaries

### Route and navigation

- `src/frontend/src/App.tsx` owns the protected route manifest and current
  wildcard fallback.
- `src/frontend/src/components/AppShell.tsx` changes only the Practice nav URL
  and active-route matching. Existing unrelated local edits in this file must
  be preserved.
- Practice links in the Flashcard library/viewer use
  `/practice?deck=:pageId`; no hidden navigation state is required.

### Shared learning library

- `FlashcardsPage.tsx` continues to load Board summaries and Board detail with
  existing APIs.
- A shared component owns Board expansion, the full-width responsive grid,
  square Page Deck cards, disabled zero-word state, and accessible card
  interaction.
- Multiple Boards remain independently expanded. No server persistence of
  expansion state is introduced.

### Preparation and active session

- The preparation dialog consumes existing `/practice/settings` data and
  presents ordered mode-name badges without changing settings.
- `PracticeSessionPage.tsx` consumes `pageId` and normalized `order` from the
  URL, then reuses existing card loading, mode sequence, answer, summary,
  speech, Finish, and Add to Review behavior.
- No backend endpoint, DTO, database schema, SRS rule, or summary contract
  changes.

## Expected Files

Likely modified:

- `src/frontend/src/App.tsx`
- `src/frontend/src/components/AppShell.tsx`
- `src/frontend/src/routes/flashcards/FlashcardsPage.tsx`
- `src/frontend/src/routes/flashcards/FlashcardViewerPage.tsx`
- `src/frontend/src/routes/flashcards/PracticeSessionPage.tsx`
- `src/frontend/src/App.test.tsx`
- affected Flashcard/Practice route and workflow Playwright specs
- `docs/product/flashcards.md`
- `docs/product/learning-workflows.md`

Likely added:

- a focused shared learning-library component under
  `src/frontend/src/components/flashcards/`
- a focused Practice preparation dialog component
- `src/frontend/src/components/ui/dialog.tsx` if no current general Dialog
  wrapper satisfies the interaction
- focused component tests for query selection, order normalization, and
  one-time session initialization

Exact component filenames may change during validation to match current code
ownership. The URL contracts and API boundary may not change without renewed
approval.

## Risks And Required Proof

| Risk | Cause and effect | Required proof |
| --- | --- | --- |
| Stale route survives | A missed nav, viewer action, or test keeps sending users to a removed path. | Route-manifest tests plus targeted `rg` showing no runtime reference to either legacy route. |
| Modal URL and selection diverge | Board data loads asynchronously or `deck` is invalid/empty, so a dialog could open for the wrong deck or remain stuck. | Component/E2E cases for valid external query, refresh, close cleanup, invalid ID, missing ID, and zero-word deck. |
| Order is lost on refresh | Session state is kept only in memory or invalid values are not normalized. | Route tests for sequential, shuffle, refresh, missing order, and invalid order fallback. |
| Shuffle changes during rerender | Initialization runs more than once under React Strict Mode or after settings/query refresh. | Focused test proving cards are initialized once per route entry and Shuffle does not rerandomize on rerender. |
| Session begins before inputs are ready | Removing the setup screen can expose incomplete cards or modes. | Loading/error/empty tests and E2E proof that active content appears only after cards and settings resolve. |
| Responsive grid misses the approved shape | Width constraints or breakpoints render fewer/more cards or non-square cards. | Chromium bounding-box/card-count assertions at wide desktop, tablet, mobile, and very-small widths. |
| Shared card harms accessibility | A whole-card action or disabled empty deck loses keyboard/focus/name semantics. | Component accessibility assertions and keyboard E2E for enabled and zero-word cards. |
| Unrelated AppShell work is overwritten | The route change overlaps a file already modified by the user. | Compare the pre-existing AppShell diff before and after implementation; patch only navigation lines. |

## Product Documentation And Decisions

- Update `docs/product/flashcards.md` with the shared full-width Board/Page Deck
  library and minimal card contract.
- Update `docs/product/learning-workflows.md` with `/practice`, query-driven
  preparation, URL order, and direct session start.
- Reconcile the historical `US-PRACTICE-001` wording where it describes the
  previous setup screen, without rewriting its historical evidence.
- No architecture decision is expected because this remains inside existing
  React Router, TanStack Query, Radix wrapper, and Practice API boundaries.

## Dependency Order

1. Validate `US-PRACTICE-002` against the live component and route surfaces.
2. Obtain explicit implementation approval.
3. Implement route, library, dialog, session initialization, tests, and product
   docs as one story.
4. Review the story, record truthful Harness proof, and close E29 only when the
   removed-route search and focused responsive/session evidence agree.
