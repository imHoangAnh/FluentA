# Design

## Controller Ownership

Target controllers:

| Controller | Owns |
| --- | --- |
| `FlashcardsController` | `GET /api/v1/flashcards/decks`, `GET /api/v1/flashcards/decks/{deckId}/cards` |
| `PracticeController` | `POST /api/v1/practice/sessions`, `POST /api/v1/practice/add-to-review`, `GET /api/v1/practice/settings`, `PUT /api/v1/practice/settings` |
| `ReviewController` | `POST /api/v1/review/sessions`, `GET /api/v1/review/sessions/{sessionId}/summary`, `GET /api/v1/review/dashboard`, `GET /api/v1/review/dashboard/{boardId}`, `GET /api/v1/review/settings`, `PUT /api/v1/review/settings`, `POST /api/v1/review` |

`SettingsController` should keep the aggregate `GET /api/v1/settings` endpoint
for profile plus learning settings composition, but it must not remain a second
home for context-owned learning write/read routes.

## Route Cutover

Routes to remove in this story:

- `POST /api/v1/flashcards/practice-sessions`
- `POST /api/v1/flashcards/sessions`
- `GET /api/v1/flashcards/sessions/{sessionId}/summary`
- `GET /api/v1/flashcards/dashboard`
- `GET /api/v1/flashcards/dashboard/{boardId}`
- `GET /api/v1/flashcards/practice-settings`
- `PUT /api/v1/flashcards/practice-settings`
- `GET /api/v1/flashcards/settings`
- `PUT /api/v1/flashcards/settings`
- `POST /api/v1/flashcards/review`

Routes to keep:

- `GET /api/v1/flashcards/decks`
- `GET /api/v1/flashcards/decks/{deckId}/cards`
- `POST /api/v1/practice/add-to-review`
- `GET/PUT /api/v1/practice/settings`
- `POST /api/v1/review/sessions`
- `GET /api/v1/review/sessions/{sessionId}/summary`
- `GET /api/v1/review/dashboard...`
- `GET/PUT /api/v1/review/settings`
- `POST /api/v1/review`

## Error Mapping

Each controller should continue mapping:

- `FlashcardError`
- `PracticeError`
- `ReviewError`

The implementation may extract a small shared controller helper/base only if it
clearly reduces duplication without reintroducing a mixed learning facade.

## Dependency Injection

The cutover should not change service ownership:

- `FlashcardsController` -> `IFlashcardService`
- `PracticeController` -> `IPracticeService`
- `ReviewController` -> `IReviewService`
- `SettingsController` -> `IAuthService` plus the already split Practice and
  Review services for aggregate profile settings

## Alternatives Considered

1. Keep legacy flashcards aliases until frontend catches up.
   Rejected because Feature 20 locked a one-time cutover with frontend updates
   in the next story and release proof requires old endpoints to disappear.
2. Move frontend client/test rewrites into this story.
   Rejected because backend route cutover is already high-risk and should stay
   reviewable on its own.
3. Keep one mixed `FlashcardsController` and only adjust route attributes.
   Rejected because Feature 20 requires controller ownership to match bounded
   context boundaries.
