# Validation

## Proof Strategy

Prove the full Page Deck study interaction and durable rating evidence while
showing ownership enforcement and exact scheduling preservation.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | Rating validation, Page Deck command, no scheduling mutation |
| Integration | Owned Page Deck cards returned; review inserted; schedule unchanged; foreign/All Words rejected |
| E2E | Normal/Shuffle, reveal, TTS fallback, Space, 1-4 ratings, progress, immediate summary, abandonment resets |
| Platform | Protected API/routes with local Postgres |
| Performance | Reveal/rating interactions remain immediate |
| Logs/Audit | Review requests logged without card content or tokens |

## Fixtures

- One user with a Page Deck containing at least four cards.
- One foreign user and Page Deck.
- One All Words card used to prove rejection.
- A Page Deck card with non-default scheduling metadata.

## Commands

```text
dotnet test src/backend/FluentA.slnx --no-restore
npm run lint
npm run test:run
npm run build
npm run test:e2e
```

## Acceptance Evidence

- `dotnet test src/backend/FluentA.slnx --no-restore`: passed 24 tests
  (8 domain, 16 application).
- `npm run lint`: passed.
- `npm run test:run`: passed 5 frontend tests.
- `npm run build`: passed; only existing third-party SignalR pure-annotation
  warnings were emitted.
- `npm run test:e2e`: passed 3 Playwright scenarios, including the focused Page
  Deck Active Recall flow.
- Focused browser proof covered Shuffle, TTS invocation, Space reveal, 1-4
  keyboard ratings, progress, abandonment reset, immediate summary, and All
  Words rejection.
- Direct API/PostgreSQL proof seeded a Page Deck card with interval `7`, ease
  factor `2.7`, repetitions `3`, due date `2030-05-06 07:08:09+00`, and state
  `Review`. A `Good` rating inserted one `CardReview` with matching schedule
  snapshots while every card schedule field remained unchanged.
- Direct API proof returned `404` for both an All Words card and a Page Deck
  card submitted by a foreign user.
