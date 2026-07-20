# E29 Flashcard And Practice Library Context

## Status

Product decisions D1-D16 were approved and implemented on 2026-07-14. On
2026-07-21 the user approved and implemented a follow-up that supersedes only
D5's density and D6's square-card shape: Flashcards and Practice now share the
compact centered 10/7/2/1 responsive deck presentation. Their different
enabled-card actions remain unchanged.

## Intake

- Type: change request to accepted Flashcard and Practice behavior.
- Expected lane: normal with stronger route, responsive, and E2E validation.
- Existing-behavior flags: protected navigation, public client routes,
  Flashcard/Practice entry actions, and the current Practice setup flow.
- No backend, API, schema, SRS, persistence, or practice-scoring change is
  requested.

## Existing Behavior

- `FlashcardsPage` currently serves both `/flashcards` and
  `/flashcards/practice` through an `entryMode` prop.
- Page-deck Practice sessions currently use
  `/flashcards/pages/:pageId/practice`.
- Board headers include the label `Vocabulary board`; Page Deck cards include
  `Vocabulary page`, description text, badges, and multiple action buttons.
- The library is constrained to `max-w-6xl`, displays at most three Page Deck
  columns on wide screens, and opens the first Board by default while allowing
  multiple Boards to remain expanded.
- Sequential/Shuffle choice and the configured Practice mode sequence are
  currently rendered in the Practice session setup screen before a separate
  Start action.
- Practice mode configuration is global and loaded from `/practice/settings`;
  session summaries and SRS boundaries remain governed by
  `docs/product/learning-workflows.md`.

## Locked Decisions

- **D1 - New Practice library route.** The dedicated Practice library moves to
  `/practice`. The old `/flashcards/practice` route is removed without a
  redirect and resolves through the app's Not Found behavior.
- **D2 - New Practice session route.** A Page Deck session uses
  `/practice/:pageId`.
- **D3 - External Practice entry.** Practice actions outside `/practice`, such
  as `Practice this Page` and `Let's practice`, navigate to `/practice`, select
  the relevant Page Deck, and automatically open its preparation modal.
- **D4 - Board expansion.** Multiple Boards may remain expanded at the same
  time and each Board can be collapsed independently.
- **D5 - Maximum-width responsive deck grid.** The library removes the
  `max-w-6xl` constraint and uses the available AppShell content width. Page
  Decks render five square cards per row on wide desktop, three on tablet, two
  on mobile, and one on very small screens.
- **D6 - Minimal Page Deck card.** Each square Page Deck card shows only the
  Page name and word count. The whole card is the interaction target. On
  `/flashcards` it opens the Flashcard viewer; on `/practice` it opens the
  preparation modal. `Vocabulary page`, descriptions, practiced badges, and
  separate action buttons are removed.
- **D7 - Default order.** Every newly opened preparation modal defaults to
  `Sequential`; the learner may switch it to `Shuffle`.
- **D8 - Mode presentation.** The modal shows the configured Practice modes as
  ordered name badges only. It does not show descriptions, edit controls, or a
  Settings link.
- **D9 - Single Start action.** `Start Practice` in the modal navigates to the
  session and starts it immediately. The duplicate order/mode setup and second
  Start action are removed from `PracticeSessionPage`.
- **D10 - Refresh-stable order.** The selected order is encoded in the session
  URL, for example `/practice/:pageId?order=shuffle`; refresh preserves it.
- **D11 - No inner library heading.** Flashcards and Practice keep only their
  AppShell title, then render the Board list immediately. The inner `Learning
  library`, `Your pages` / `Choose a page to practice`, and `Add vocabulary`
  header is removed.
- **D12 - Empty deck.** A Page Deck with zero words remains visible with
  `0 words` but is disabled and opens neither viewer nor modal.
- **D13 - Session redesign boundary.** This change redesigns only the
  Flashcards/Practice libraries, modal, navigation, and routes. Flashcard
  viewer and active Practice content remain visually unchanged except for
  removal of the duplicated Practice setup.
- **D14 - Remove the old session route.** The old
  `/flashcards/pages/:pageId/practice` route is removed without a redirect.
- **D15 - Refresh-stable modal target.** External Practice actions use
  `/practice?deck=:pageId`; loading or refreshing that URL automatically opens
  the matching Page Deck modal.
- **D16 - Modal close URL.** Closing or cancelling the query-driven modal
  removes `?deck=...` and leaves the learner at `/practice`.

## Approved Layout Shape

For each expanded Board:

```text
Board name                                      5 decks  ^
---------------------------------------------------------
[ Page 1 ] [ Page 2 ] [ Page 3 ] [ Page 4 ] [ Page 5 ]
[ 12 words] [ 8 words] [24 words] [ 0 words] [17 words]
```

Board headers show only Board name, Page Deck count using `deck/decks`
terminology, and the expansion icon. They do not show `Vocabulary board`.

## Feature Boundary

In scope:

- Protected route manifest and AppShell Practice navigation.
- Flashcards/Practice shared Board and Page Deck library presentation.
- Practice preparation modal, query-driven modal selection, and URL order.
- Entry links from the Flashcard library and viewer.
- Responsive, keyboard, focus, loading, empty, invalid-query, and refresh
  behavior for the affected surfaces.

Out of scope:

- Backend endpoints, database schema, session-summary payload, SRS behavior,
  Add to Review behavior, Practice answer evaluation, Web Speech behavior, or
  Practice Settings editing.
- Visual redesign of the Flashcard viewer or active Practice exercises.
- Compatibility redirects for either removed legacy Practice route.
- Per-session mode overrides or persistence of the learner's most recent
  Sequential/Shuffle choice.

## Planning Questions

- Select the smallest shared library/card component boundary that avoids
  duplicating Flashcards and Practice layouts.
- Define Not Found and invalid `deck` query proof using the repository's
  current route fallback.
- Define how query order is normalized when missing or invalid; the product
  default remains Sequential.
- Reconcile route-manifest, learning-navigation, Flashcard viewer, Practice
  workflow, and responsive Chromium tests with the removed routes.

## Product Contracts To Reconcile

- `docs/product/flashcards.md`
- `docs/product/learning-workflows.md`
- `docs/stories/epics/E04-review-sessions/US-PRACTICE-001-practice-modes.md`
