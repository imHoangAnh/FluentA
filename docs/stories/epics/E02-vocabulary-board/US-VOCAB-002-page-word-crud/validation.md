# Validation

## Proof Strategy

The story is done when word content rules are unit-tested, ownership is
enforced by the authenticated API path, the migration builds, and the browser
can create, edit, and delete a word in a selected page.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | Word normalization, update, soft delete, request validation |
| Integration | Authenticated CRUD routes and ownership-scoped repository queries |
| E2E | Create board/page, select page, create/edit/delete word |
| Platform | Frontend production build |
| Performance | Not separately measured for this bounded CRUD slice |
| Logs/Audit | Existing request log middleware covers word routes |

## Fixtures

- Board: `IELTS Vocabulary`, language `en`.
- Page: `Unit 1 - Education`.
- Word: `mitigate`, class `verb`.

## Commands

```text
dotnet test src/backend/FluentA.slnx
npm run test:run --prefix src/frontend
npm run build --prefix src/frontend
```

## Acceptance Evidence

- `dotnet tool run dotnet-ef database update --project FluentA.Infrastructure
  --startup-project FluentA.API` applied `AddVocabularyWordCrud`.
- `dotnet test src/backend/FluentA.slnx` passed 17 tests.
- `npm run lint --prefix src/frontend` passed.
- `npm run test:run --prefix src/frontend` passed 3 tests.
- `npm run build --prefix src/frontend` passed.
- `npx playwright test e2e/vocab-smoke.spec.js --reporter=line` passed the
  rendered register/login, board/page creation, word create/edit/delete, and
  page delete flow.
- Browser plugin was not available; repository Playwright was used.
