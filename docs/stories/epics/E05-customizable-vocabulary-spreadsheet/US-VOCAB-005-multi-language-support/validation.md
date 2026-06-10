# Validation

## Proof Strategy

Prove language behavior at helper, component, API DTO, and browser levels.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | Language labels and TTS voice selection; vocabulary table Pinyin labels; flashcard service deck DTO includes board language. |
| Integration | Backend solution tests cover application contract; API build verifies DTO consumers compile. |
| E2E | Chinese board shows Pinyin labels in vocabulary and review answer. |
| Platform | Browser smoke uses Playwright against local API and Vite. |

## Fixtures

Playwright creates an isolated user, a Chinese board, one page, and one word.

## Commands

```text
dotnet test src/backend/FluentA.slnx --no-restore
npm run lint
npm run test:run
npm run build
npm run test:e2e
```

## Acceptance Evidence

- `dotnet test src/backend/FluentA.slnx --no-restore`: passed, 42 tests.
- `dotnet build src/backend/FluentA.API/FluentA.API.csproj --no-restore`: passed, 0 warnings/errors.
- `npm run lint`: passed.
- `npm run test:run`: passed, 18 frontend tests.
- `npm run build`: passed; only known third-party SignalR pure-annotation warnings from Rolldown.
- `npx playwright test e2e/vocab-multilanguage.spec.js --workers=1`: passed.
- `npx playwright test --workers=1`: passed, 8 E2E scenarios.
