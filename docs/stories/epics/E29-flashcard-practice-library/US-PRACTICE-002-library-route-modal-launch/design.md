# US-PRACTICE-002 Design

## Shared Library Boundary

- Keep data fetching and route decisions in `FlashcardsPage`.
- Extract only the Board accordion and Page Deck grid/card presentation so both
  entry modes use identical responsive markup.
- Pass an explicit enabled-deck action from the route. Do not infer behavior
  from pathname inside presentational cards.
- Use a semantic button for Practice and a semantic link/navigation target for
  Flashcards. Disabled zero-word cards remain perceivable and non-actionable.

## URL And Dialog State

- `/practice?deck=:pageId` is the external selection contract.
- Resolve the query only after Board/Page data is available. A valid non-empty
  Page Deck controls the dialog; invalid and zero-word IDs must not synthesize
  a selection.
- Each transition from no selected deck to a selected deck initializes order
  to `sequential`. Closing clears the `deck` query with router navigation while
  leaving the learner on `/practice`.
- Render settings-loading and settings-error states inside the dialog and keep
  Start unavailable until the existing configured mode sequence is ready.
- Use a general Radix Dialog wrapper with labelled title/description, focus
  trap, Escape/Cancel close, and safe focus restoration to the selected card.

## Direct Session Initialization

- Session URL order accepts `sequential` and `shuffle`; missing or any other
  value behaves as `sequential`.
- Remove the current setup state from `PracticeSessionPage`; retain active
  exercise and completion state.
- Build the initial card order only after both cards and global Practice
  settings have resolved. Ensure React Strict Mode and query rerenders cannot
  reshuffle or reset progress for the same route entry.
- Navigating to a different `pageId` or order is a new route entry and may
  initialize a new session.
- Empty/not-found/error handling must remain explicit; auto-start must not turn
  unresolved data into a completed or empty session.

## Route Cutover

- Register `/practice` and `/practice/:pageId` in `App.tsx`.
- Remove `/flashcards/practice` and
  `/flashcards/pages/:pageId/practice` registrations.
- Update AppShell Practice navigation, Flashcards Page Deck Practice entry,
  viewer `Practice this Page`, dashboard `Let's practice`, and every other
  runtime reference discovered by targeted search.
- Preserve the current wildcard route. Acceptance for a removed legacy URL is
  landing at `/`, because the application currently redirects wildcard paths
  there rather than rendering a dedicated 404 page.

## Responsive Presentation

- Remove the library `max-w-6xl` cap and consume the route content width.
- Use explicit responsive grid columns that yield 1, 2, 3, and 5 cards at the
  approved breakpoints. Keep cards square through `aspect-square`; text wraps
  or truncates safely without forcing horizontal overflow.
- Board headers remain full-width controls with name, grammatical deck count,
  and expansion icon. Multiple expanded IDs are retained independently.

## Expected Tests

- `App.test.tsx` and route-manifest tests for both new routes and both removed
  routes using the real wildcard result.
- Shared-library tests for Board expansion, grammatical counts, minimal card
  content, enabled destinations, and disabled zero-word behavior.
- Dialog tests for external query, async resolution, Sequential reset,
  Shuffle, ordered mode names, loading/error, Close/Escape cleanup, and Start
  destination.
- Practice session tests for order normalization, refresh reconstruction,
  one-time Shuffle, and no duplicate setup UI.
- Focused Playwright updates for learning navigation, viewer entry, Practice
  workflow, and responsive bounding-box/card-count proof.
- Static `rg` over runtime sources for the two legacy URL shapes.
