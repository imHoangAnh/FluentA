# Design

## Client Ownership

Keep one frontend learning API module for now, but align each function to the
owned backend route family:

| Function | Target route |
| --- | --- |
| `listDecks`, `getDeckSession` | `/flashcards/*` |
| `createPracticeSessionSummary`, `addPracticeWordsToReview`, Practice settings | `/practice/*` |
| `createReviewSession`, `getReviewSessionSummary`, `submitReview`, Review settings, dashboard | `/review/*` |

This story does not require splitting the frontend API module into separate
files as long as the route ownership is correct.

## Cache Ownership

React Query keys should follow bounded-context ownership for mutable
Practice/Review settings and dashboard state:

- `['practice', 'settings']`
- `['review', 'settings']`
- `['review', 'dashboard']`

Flashcard deck reads remain under Flashcard-owned keys such as:

- `['flashcard', 'decks']`
- `['flashcard', 'deck-session', deckId]`

## Test Cutover

Focused frontend proof should stop calling removed backend routes:

- `/api/v1/flashcards/practice-sessions` -> `/api/v1/practice/sessions`
- `/api/v1/flashcards/sessions` -> `/api/v1/review/sessions`
- `/api/v1/flashcards/sessions/{id}/summary` -> `/api/v1/review/sessions/{id}/summary`
- `/api/v1/flashcards/review` -> `/api/v1/review`
- `/api/v1/flashcards/dashboard` -> `/api/v1/review/dashboard`

Support code that seeds database state must also respect the owned schemas
introduced by `US-BC-004`, for example `review.word_states`.

## Constraints

Do not:

- reintroduce frontend calls to removed mixed routes
- reintroduce mixed cache ownership for Practice/Review settings and dashboard
- change Flashcard deck/card read routes
- treat unrelated stale UI locators as endpoint-cutover regressions
