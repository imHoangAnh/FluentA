# Validation

## Proof Strategy

Prove sanitizer behavior, plain-text preview derivation, debounced autosave,
supported formatting, and migration safety before marking the story complete.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | Safe formatting retained; scripts and unsafe attributes removed; plain text and preview derived; service uses processed content. |
| Integration | Migration backfills plain text and API persists sanitized HTML. |
| E2E | Create rich entry, format content, observe autosave status, reload, and verify safe persisted HTML. |
| Platform | Backend tests/build, frontend lint/tests/build, focused Playwright. |
| Performance | Tiptap editor becomes interactive within 500ms in focused browser proof. |
| Logs/Audit | Existing request logs cover autosave PATCH requests. |

## Fixtures

- One verified learner.
- One rich-text Journal entry containing Unicode and attempted unsafe markup.

## Commands

```text
dotnet test src/backend/FluentA.slnx
dotnet build src/backend/FluentA.slnx
dotnet ef database update
npm --prefix src/frontend run lint
npm --prefix src/frontend run test:run
npm --prefix src/frontend run build
npx playwright test e2e/journal-rich-text-autosave.spec.js
.\scripts\bin\harness-cli.exe story verify US-JOURNAL-002
```

## Acceptance Evidence

Passed on 2026-06-11:

- Backend solution passed 37 Domain and 60 Application tests.
- Backend solution build passed with zero warnings and zero errors.
- `AddJournalRichTextContent` was reverted and replayed successfully, proving
  the migration safely HTML-encodes legacy plain content while backfilling
  `plain_text_content`.
- Frontend lint passed; Vitest passed 28 tests; production build passed with
  the known third-party SignalR/Rolldown annotation warning.
- The editor is code-split and preloaded from Dashboard; main application
  output is approximately 462 KB and the Journal-only editor chunk is
  approximately 414 KB before gzip.
- Focused Playwright passed supported toolbar visibility, bold Unicode HTML,
  server-side unsafe markup removal, two-second autosave durability, a `<500ms`
  editor-load assertion, and desktop/mobile rendered checks.
- Original Journal CRUD/ownership Playwright regression passed.
- `.\scripts\bin\harness-cli.exe story verify US-JOURNAL-002` passed.

