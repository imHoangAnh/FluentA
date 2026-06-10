# US-REVIEW-004 Session Summary API

## Status

implemented

## Lane

normal

## Product Contract

FluentA must expose the review-session API routes named in `SPEC.md`:

- `POST /api/v1/flashcards/sessions` validates an owned active deck and returns
  a server-generated `sessionId`.
- `GET /api/v1/flashcards/sessions/{sessionId}/summary` returns rating counts,
  percentages, total reviewed cards, and average time from durable review
  history scoped to the authenticated user.

## Relevant Product Docs

- `SPEC.md`
- `docs/product/flashcards.md`
- `docs/stories/spec-coverage-map.md`

## Acceptance Criteria

- Review sessions use a server-issued session id.
- Missing, foreign, or empty session summaries are rejected as not found.
- Completed Page Deck sessions expose durable Easy, Good, Hard, and Again
  summary counts through the summary endpoint.
- Existing route-local summary UI still renders immediately after completion.

## Design Notes

- Commands: `CreateReviewSessionAsync`, `SubmitReviewAsync`.
- Queries: `GetReviewSessionSummaryAsync`.
- API: `POST /api/v1/flashcards/sessions`,
  `GET /api/v1/flashcards/sessions/{sessionId}/summary`.
- Tables: no new table; `card_reviews.session_id` is the durable session key.
- Domain rules: review rows remain append-only; session ownership is derived by
  joining reviews through cards and decks to the authenticated user.
- UI surfaces: review sessions call the create-session endpoint before showing
  the first card.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | `dotnet test src/backend/FluentA.slnx --no-restore` |
| Integration | `dotnet build src/backend/FluentA.API/FluentA.API.csproj --no-restore` |
| E2E | `npx playwright test e2e/page-deck-active-recall.spec.js --workers=1` |
| Platform | `npx playwright test --workers=1` |
| Release | `npm run lint && npm run build` |

## Harness Delta

`docs/stories/spec-coverage-map.md` now maps `US-019` to both the immediate
summary UI and the explicit SPEC session API routes.

## Evidence

- Backend: 49 tests passed.
- API build: 0 warnings, 0 errors.
- Frontend: 18 tests passed; lint passed; production build passed.
- Playwright: focused Page Deck/session-summary scenario passed; full 10-test
  suite passed.
