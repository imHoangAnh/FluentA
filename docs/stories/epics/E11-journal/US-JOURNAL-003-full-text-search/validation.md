# Validation

## Proof Strategy

Prove query validation, owner/deleted isolation, contextual highlights, trigram
index migration, Unicode search, and rendered highlighting.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | Query validation; contextual snippet; multiple highlight ranges; no full content returned. |
| Integration | Migration applies; owner-scoped active ILIKE search; foreign/deleted entries excluded. |
| E2E | Unicode search filters results, highlights matched preview text, opens result, and clears back to full list. |
| Platform | Backend tests/build, frontend lint/tests/build, focused Playwright. |
| Performance | Search is bounded to 50 and backed by an active-row trigram index. |
| Logs/Audit | Existing request logs cover search endpoint. |

## Fixtures

- Two verified learners.
- Matching, non-matching, foreign, and deleted Journal entries.

## Commands

```text
dotnet test src/backend/FluentA.slnx
dotnet build src/backend/FluentA.slnx
dotnet ef database update
npm --prefix src/frontend run lint
npm --prefix src/frontend run test:run
npm --prefix src/frontend run build
npx playwright test e2e/journal-search.spec.js
.\scripts\bin\harness-cli.exe story verify US-JOURNAL-003
```

## Acceptance Evidence

Passed on 2026-06-12:

- Backend solution passed 37 Domain and 61 Application tests.
- Backend solution build passed with zero warnings and zero errors.
- `AddJournalSearchIndex` migration applied successfully.
- PostgreSQL confirmed `pg_trgm` is installed and
  `ix_journal_entries_active_plain_text_trgm` exists as a partial GIN trigram
  index for active Journal rows.
- `EXPLAIN` with sequential scans disabled used
  `ix_journal_entries_active_plain_text_trgm` for `ILIKE '%xin chào%'`.
- Frontend lint, 28 Vitest tests, and production build passed with the known
  third-party SignalR/Rolldown annotation warning.
- Focused Playwright passed Unicode content search, two highlighted matches,
  owner isolation, deleted-row exclusion, wildcard escaping, invalid-query
  `422`, opening a result, and clearing back to the full list.
- `.\scripts\bin\harness-cli.exe story verify US-JOURNAL-003` passed.

