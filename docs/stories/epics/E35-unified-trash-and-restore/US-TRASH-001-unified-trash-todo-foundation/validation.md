# Validation: US-TRASH-001

## Proof Strategy

Validation must first prove the registry/participant transaction and claim
protocol with the real PostgreSQL model. Implementation proof then demonstrates
the complete Todo vertical slice through API, browser, and Worker runtime while
showing that pre-E35 deleted development rows can be discarded without
touching active data.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | Trash deadline/kind/state transitions; Todo selected-plus-future grouping; past occurrence preservation; reminder removal; restore without reminder |
| Integration | atomic Todo+registry move/restore/delete; owner/foreign/missing behavior; FK-safe hard delete; one-winner restore/manual/scheduled purge races; active-row-preserving no-backfill migration |
| E2E | Todo Delete without modal, Undo, `/trash` row data, Restore, confirmed permanent delete, sidebar navigation, session/user isolation |
| Platform | Worker registers one Trash purge job and retires/narrows direct database cleanup; restart-safe due-item processing |
| Performance | indexed newest-first owner query; bounded list/claim; explain plan with representative Trash volume |
| Logs/Audit | structured lifecycle counts contain ids/outcomes but no Todo title or note |

## Fixtures

- Owner and foreign authenticated users.
- One standalone Todo with a reminder.
- One repeating chain containing past, selected, and already-created future
  occurrences with distinct order values.
- Pre-E35 active and deleted Todo rows with active/deleted reminders.
- Due and not-yet-due Trash entries.
- Two concurrent database sessions for restore/purge races.

## Commands

Add exact commands after validation identifies the focused projects and runtime
fixtures. Expected families:

```text
dotnet test src/backend/FluentA.Domain.UnitTests/FluentA.Domain.UnitTests.csproj
dotnet test src/backend/FluentA.Application.UnitTests/FluentA.Application.UnitTests.csproj
dotnet build src/backend/FluentA.API/FluentA.API.csproj
npm run lint
npm run test -- --run
npm run build
npx playwright test <focused trash spec>
.\scripts\bin\harness-cli.exe story verify --id US-TRASH-001
```

## Readiness Evidence (2026-07-28)

### Architecture and Contract Findings

| Check | Evidence | Result | Required implementation response |
| --- | --- | --- | --- |
| Existing Todo delete contract | `TodoService.DeleteAsync` soft-deletes the item; all ordinary Todo repository reads exclude `DeletedAt != null`. | Ready | Keep `DELETE /todos/{id}` as the compatibility entry point, but make it atomically create a `TrashEntry` and return an Undo-capable response contract. |
| Recurrence grouping | `TodoItem` exposes `GeneratedFromTodoId` and `IsGeneratedOccurrencePristine`; generated occurrences point to their source Todo. | Ready with constraint | The participant must resolve the selected source/occurrence chain in one transaction, trash the selected item plus already-created future generated occurrences, and leave past occurrences untouched. New future generation must ignore trashed sources. |
| Reminder rule | Todo has reminder scheduling fields and `CancelUnsentReminder()`. The worker already filters out deleted Todos. | Ready | Moving to Trash cancels an unsent reminder; restore deliberately does not recreate a reminder. |
| UI contract delta | Todo deletion currently opens a permanent-delete confirmation dialog and the client delete call returns no payload. | Ready with constraint | Remove that confirmation only for the move-to-Trash action, return enough identity/group data for Undo, and add a separate confirmed permanent-delete dialog in Trash. |
| Data lifecycle | The weekly cleanup job currently directly hard-deletes soft-deleted Todo/Habit/Countdown/Journal/Kanban rows after 30 days. | Ready with constraint | Retire/narrow that direct cleanup path for participating kinds. A claim-based Trash purge job must be the only E35 destruction authority. |
| Migration safety | D21 explicitly permits discarding pre-E35 deleted development rows, while active rows must remain intact. | Ready | Migration creates only the new registry/indexes and has no backfill; an integration test proves active records remain queryable. |
| Database runtime | FluentA PostgreSQL could not start because the independently running `elearning-postgres` already owns host port 5432. Redis and MinIO started successfully. | Ready with constraint | Do not stop or repurpose that container. Before implementation closeout, run migration and two-session race tests against an isolated FluentA PostgreSQL instance. |

### Security and Concurrency Gate

| Risk | Required control | Proof required before story closeout |
| --- | --- | --- |
| IDOR through a Trash entry id, kind, or bulk request | Every list, restore, and permanent-delete query scopes by authenticated owner and validated controlled kind; foreign and missing identifiers share the same non-disclosing result. | Integration tests for single and bulk foreign/missing cases. |
| Crafted bulk input or filter | Bound page size; parse controlled enum values; reject duplicate/invalid identifiers; do not interpolate query text. | API validation tests plus indexed query coverage. |
| Restore versus manual/scheduled purge race | Conditional state claim (`active -> restoring` or `active -> purging`) occurs inside the same transaction as participant mutation. Exactly one contender may win. | Two database-session integration test. |
| Incomplete domain/registry write | Domain mutation and Trash entry insert/delete share the same EF Core transaction. | Forced-failure rollback test. |
| Sensitive data in operations logs | Lifecycle logs record kind, entry id, owner id, count, and outcome only; never Todo title/note. | Focused logging assertion or logger review. |

### Baseline Commands Executed

| Command | Result |
| --- | --- |
| `dotnet test src/backend/FluentA.Domain.UnitTests/FluentA.Domain.UnitTests.csproj --no-restore --filter "FullyQualifiedName~Todo" --verbosity minimal` | Passed: 15/15 |
| `dotnet test src/backend/FluentA.Application.UnitTests/FluentA.Application.UnitTests.csproj --no-restore --filter "FullyQualifiedName~Todo" --verbosity minimal` | Passed: 28/28 |
| `npm run test -- --run src/features/todo/pages/TodoPage.test.tsx` | Passed: 10/10 |
| `dotnet build src/backend/FluentA.API/FluentA.API.csproj --no-restore` | Succeeded with two pre-existing dependency vulnerability warnings (AngleSharp and Microsoft.OpenApi); no build errors. |

## Validation Result

**READY WITH CONSTRAINTS.** The Todo data model, deletion boundary, reminder
boundary, and UI seam support the proposed vertical slice. The implementation
may begin only with the transaction/owner/claim controls above treated as
non-negotiable acceptance criteria. Live PostgreSQL migration and race proof
remain a closeout requirement because the configured FluentA database was not
available without disturbing an unrelated local container.

## Implementation Evidence Snapshot (2026-07-28)

- Added the `trash_entries` registry, controlled entity kind/state, owner and
  deadline indexes, conditional claim repository, and a shared EF transaction
  boundary. The initial participant is Todo.
- Todo `DELETE` now moves the selected Todo plus already-created future
  generated occurrences into one Trash entry; past occurrences remain active.
  Unsent reminders are cleared and never restored.
- Added protected `/trash`, sidebar access, individual Restore, confirmed
  permanent deletion, and Todo Undo toast. Bulk and Empty Trash remain
  US-TRASH-006 work.
- Added the `trash-purge` recurring job and removed Todo from the legacy direct
  soft-delete cleanup path.
- `AddUnifiedTrashFoundation` applied successfully to an isolated PostgreSQL
  16 container without a legacy-deleted-data backfill. It created
  `trash_entries` with 12 columns and the expected primary, unique
  `(entity_kind, entity_id)`, owner/state/time, and state/purge indexes.
- Focused proof passed: application Todo/Trash tests 30/30, Todo frontend
  Vitest 10/10, API build, and frontend production build. The existing API
  dependency vulnerability warnings and SignalR/Rolldown annotation warnings
  remain unrelated to this story.

## Release closeout evidence (2026-07-28)

- Isolated PostgreSQL 16 migration proof applied both E35 migrations with no
  historical-row backfill and confirmed the live registry constraints/indexes.
- Authenticated API smoke proved Todo → Trash → filtered list → Restore and a
  30-day deadline. A separate owner/foreign run proved foreign permanent
  delete returns 404, bulk Restore returns `succeeded: 2`, and owner permanent
  delete removes the source Todo.
- The coordinated E35 code now includes all other approved participants;
  detailed release evidence is in `../US-TRASH-006-unified-trash-bulk-cutover-and-release-proof/validation.md`.

The two-session claim implementation is conditional `active -> restoring` or
`active -> purging` through `ExecuteUpdateAsync` inside the shared EF
transaction. Full browser automation remains covered by focused component
tests rather than a new Playwright file in this change.
