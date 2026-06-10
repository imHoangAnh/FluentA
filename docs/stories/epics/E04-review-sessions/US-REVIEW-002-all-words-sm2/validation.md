# Validation

## Proof Strategy

Prove the SM-2 rule independently, then prove the owned repository command
persists the calculated card state and matching review snapshot atomically.
Finally prove the shared browser workflow reaches All Words Normal/Shuffle and
preserves Page Deck behavior.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | Again/Hard reset, first/second/later Good/Easy, ease clamp, midpoint-away interval rounding, state thresholds, timezone validation |
| Integration | Owned All Words update plus review snapshot; Page Deck unchanged; foreign card rejected; invalid timezone rejected |
| E2E | All Words Normal/Shuffle entry, reveal, keyboard ratings, visible completion summary, refreshed schedule |
| Platform | IANA timezone parsing, DST/invalid-midnight conversion on local .NET runtime, and local Postgres transaction proof |
| Performance | Rating command and visible advance remain responsive |
| Logs/Audit | Review request logged; SignalR invalidation only after commit |

## Fixtures

- An owned All Words deck with new, learning, review, and mature scheduling
  states.
- A Page Deck card proving unchanged scheduling.
- A foreign user's All Words card.
- Timezones `Asia/Ho_Chi_Minh` and `America/New_York`, including DST dates.

## Commands

```text
dotnet test src/backend/FluentA.slnx --no-restore
dotnet build src/backend/FluentA.API/FluentA.API.csproj --no-restore
npm run lint
npm run test:run
npm run build
npm run test:e2e
```

## Acceptance Evidence

- `dotnet test src/backend/FluentA.slnx --no-restore`: passed 33 tests
  (15 domain, 18 application).
- `dotnet build src/backend/FluentA.API/FluentA.API.csproj --no-restore`:
  passed with zero warnings and zero errors.
- `npm run lint`, `npm run test:run`, and `npm run build`: passed; 5 frontend
  tests passed and only known third-party SignalR annotation warnings appeared.
- `npm run test:e2e`: passed 4 Playwright scenarios, including All Words Normal
  and Shuffle SM-2 progression plus Page Deck regression.
- Direct API/PostgreSQL proof seeded an All Words card at interval `10`, ease
  `2.05`, repetitions `3`, and state `Review`. Easy produced interval `21`,
  ease `2.15`, repetitions `4`, state `Mature`, and a matching review snapshot
  in the same command.
- The same runtime proof stored `2026-06-30 04:00:00+00` for the target New
  York-local calendar date, preserved seeded Page Deck scheduling exactly,
  returned `422` for an invalid timezone, and returned `404` for a foreign
  user's submission.
