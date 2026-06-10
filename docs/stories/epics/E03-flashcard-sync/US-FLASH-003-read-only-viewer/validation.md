# Validation

## Proof Strategy

Prove owner-scoped reads, protected route behavior, correct grouped content,
SignalR-driven visible refresh, and the under-three-second requirement.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | Read model mapping and ownership filtering |
| Integration | Owned active decks/cards returned; foreign/deleted data excluded |
| E2E | Protected route, grouped cards, create/update/delete live refresh |
| Platform | Authenticated API and SignalR operate with local services |
| Performance | Mutation-to-visible-card update below three seconds |

## Acceptance Evidence

- `dotnet test src/backend/FluentA.slnx --no-restore` passed 22 tests: 8 domain
  and 14 application.
- `npm run lint`, `npm run test:run` (4 tests), and `npm run build` passed.
- Production build lazy-loads SignalR into a separate chunk.
- `npm run test:e2e` passed the existing vocabulary CRUD smoke and the new
  flashcard viewer smoke.
- Viewer smoke proved anonymous route redirect, grouped Page and All Words
  decks, and foreign-user deck exclusion.
- Live create/update/delete rendered without reload in `1949 ms`, `141 ms`,
  and `152 ms`, respectively.
- Desktop `1440x1000` and mobile `390x844` visual QA showed readable grouped
  cards with no clipping or framework overlay.
- In-app Browser was unavailable, so rendered QA used the repo's Playwright
  workflow as the recorded fallback.
- API logs showed successful owner-scoped deck reads and no application errors
  or logged access tokens.
