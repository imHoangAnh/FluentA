# Validation

## Proof Strategy

The story is done when board/page domain behavior is unit-tested, the database
migration applies to local Postgres, authenticated API smoke proves owner-scoped
CRUD and deck side effects, and the rendered protected UI can create a board
and page.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | Board creation validates name/language and creates pages with order |
| Integration | Migration applies; API creates boards/pages for an authenticated user |
| E2E | Browser login, board creation, page creation, page rename/delete |
| Platform | Docker Postgres remains healthy during migration/API smoke |
| Performance | Not required for this slice |
| Logs/Audit | Existing request logs cover board/page calls |

## Fixtures

- Authenticated learner created through `/api/v1/auth/register`.
- Board: `IELTS Vocabulary`, language `en`.
- Page: `Unit 1 - Education`.

## Commands

```text
docker compose -f docker-compose.dev.yml up -d
dotnet tool run dotnet-ef database update --project src/backend/FluentA.Infrastructure --startup-project src/backend/FluentA.API
dotnet test src/backend/FluentA.slnx
cd src/frontend && npm run test:run
cd src/frontend && npm run build
cd src/frontend && npm run lint
```

## Acceptance Evidence

- `docker compose -f docker-compose.dev.yml ps` showed healthy Postgres and
  Redis before migration/API smoke.
- `dotnet tool run dotnet-ef migrations add AddVocabularyBoardPageManagement
  --project src/backend/FluentA.Infrastructure --startup-project
  src/backend/FluentA.API --output-dir Persistence/Migrations` generated the
  board/page/deck migration.
- `dotnet tool run dotnet-ef database update --project
  src/backend/FluentA.Infrastructure --startup-project src/backend/FluentA.API`
  applied the migration; final rerun reported database already up to date.
- `dotnet test src/backend/FluentA.slnx` passed 14 backend tests.
- API smoke passed register/login, board create/list/detail, page create/rename,
  page delete `404`, board delete `404`, and direct Postgres deck check.
- Direct Postgres deck check found 2 active decks for the created board:
  `IELTS Vocabulary - All Words` and `IELTS Vocabulary - Unit 1 - Learning`.
- `cd src/frontend && npm run test:run` passed 3 frontend tests.
- `cd src/frontend && npm run build` passed.
- `cd src/frontend && npm run lint` passed.
- `cd src/frontend && npm run test:e2e -- "e2e/vocab-smoke.spec.js"
  --reporter=line` passed rendered board/page management smoke.
- In-app Browser fallback: Browser plugin was present but missing required
  `scripts/browser-client.mjs`, so standalone Playwright was used.
