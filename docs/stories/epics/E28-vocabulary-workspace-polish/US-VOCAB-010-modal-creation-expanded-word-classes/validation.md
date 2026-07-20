# US-VOCAB-010 Validation

## Readiness Status

`READY` - validated 2026-07-20. The user's implementation request explicitly
authorizes this story's exact scope.

## Reality Gate

| Assumption | Risk | Evidence | Result |
| --- | --- | --- | --- |
| Creation can move to modal without an API change. | Modal state could require a new workflow. | `WorkspacePage.tsx` already owns `createBoard` and `createPage`; only the current form presentation changes. | Ready |
| An accessible modal primitive exists. | A custom overlay could regress focus and Escape behavior. | `shared/components/ui/dialog.tsx` is Radix-backed and already powers `RenameEntityDialog`. | Ready |
| New classes do not require a migration. | Stored values could exceed the current column. | `VocabWordConfiguration` uses `HasConversion<string>().HasMaxLength(20)`; the longest new enum name is 11 characters. | Ready |
| Current behavior is green before changes. | Failures could be misattributed to this story. | Focused frontend tests passed 12/12 and `VocabularyServiceTests` passed 11/11 on 2026-07-20. | Ready |

## Locked Constraints

- Preserve all current Board/Page endpoints and payload shapes.
- Keep API Word-class values lowercase; use separate labels for spaces.
- Do not add a database migration or change ownership/sync behavior.
- Preserve unrelated worktree changes.

## Baseline Evidence

| Command | Result |
| --- | --- |
| `npm --prefix src/frontend run test:run -- src/test/vocabulary/WorkspacePage.test.tsx src/test/vocabulary/VocabTable.test.tsx` | Passed 12/12. |
| `dotnet test src/backend/FluentA.Application.UnitTests/FluentA.Application.UnitTests.csproj --filter FullyQualifiedName~VocabularyServiceTests --no-restore` | Passed 11/11. |

## Closeout Evidence

### Acceptance Evidence

| Acceptance area | Evidence |
| --- | --- |
| Modal Board/Page creation | `CreateVocabularyDialog.tsx` uses the shared Radix Dialog wrapper. Component tests prove fields are absent from the inline workspace, both dialogs open from their triggers, Cancel/Escape cause no request, trimmed payloads reach the existing mutations, and successful creation closes the dialog. |
| Fixed `Add page` position | `WorkspacePage.tsx` renders `Add page` before the `sortedPages.map(...)` block. A component test proves it precedes both newest and earlier Page controls. |
| Expanded Word classes | The domain enum contains all six new members. `VocabularyServiceTests` proves every lowercase request value parses and round-trips; `VocabTable.test.tsx` proves readable labels with stable API values. |
| Existing UI regression | The full frontend unit suite and the existing desktop/tablet Vocabulary Chromium scenarios pass. |
| Product reconciliation | `docs/product/vocabulary-board.md` now defines modal creation, fixed action placement, and the expanded class contract. |

### Commands And Results

| Command | Result |
| --- | --- |
| `npm --prefix src/frontend run test:run` | Passed 68/68 across 17 files. |
| `dotnet test src/backend/FluentA.Application.UnitTests/FluentA.Application.UnitTests.csproj --no-restore` | Passed 121/121. |
| Focused ESLint for changed Vocabulary files | Passed. |
| `npm exec -- vite build` from `src/frontend` | Passed; existing SignalR/Rolldown annotation warnings remain. |
| `npm run test:e2e -- e2e/vocab-workspace-polish.spec.js` | Passed 2/2 mocked-API Chromium scenarios at desktop and tablet sizes. |
| Scoped `git diff --check` for this story | Passed with line-ending notices only. |

### Recorded Constraints

- The repository-wide `npm --prefix src/frontend run lint` and `build` commands
  are currently blocked by pre-existing unused declarations in the unrelated
  dirty files `ReviewSessionPage.tsx` and `TodoPage.tsx`. The full build reported
  no type error in this story's files, focused ESLint passed, and direct Vite
  production bundling passed.
- Repository-wide `git diff --check` is blocked by pre-existing trailing
  whitespace in the unrelated dirty `TodoPage.tsx`; the scoped story check
  passed.
- Browser proof uses mocked current APIs, so live API/database integration is
  not claimed.

### Review Findings

- No P1 or P2 findings.
- No endpoint, schema, migration, ownership, autosave, flashcard sync, or review
  sync behavior changed.
