# Validation

## Proof Strategy

Prove that Flashcard and Practice now read from owner-scoped active vocabulary
pages and words, expose page-based contracts, and no longer require
`flashcard_decks` or `flashcard_cards` on the active route/API paths.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | Flashcard/Practice service and repository coverage for owner-scoped page reads and page-based summary validation |
| Integration | API reads return active pages/words only; foreign page returns 404; practice summary/add-to-review validate page ownership |
| E2E | Flashcard list/viewer and Practice entry flow use page-based routes and preserve current viewer/session behavior |
| Platform | frontend lint/build and backend API build |
| Performance | not targeted in this slice |
| Logs/Audit | existing request/error behavior only |

## Fixtures

- Authenticated learner with two boards, multiple pages, and at least one empty
  page.
- Foreign-owned board/page for ownership proof.
- Deleted page or deleted word fixture to prove active-only reads.

## Commands

```text
dotnet test src/backend/FluentA.Application.UnitTests/FluentA.Application.UnitTests.csproj --filter "Flashcard|Practice|Vocabulary"
dotnet build src/backend/FluentA.API/FluentA.API.csproj --no-restore
npm --prefix src/frontend run lint
npm --prefix src/frontend run test:run -- App.test.tsx
npm --prefix src/frontend run build
.\scripts\bin\harness-cli.exe query matrix
git diff --check
```

## Acceptance Evidence

- Pending implementation.
