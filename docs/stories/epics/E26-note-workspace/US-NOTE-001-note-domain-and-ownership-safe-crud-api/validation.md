# Validation

## Proof Strategy

Prove that FluentA can persist owner-scoped Note boards and Note pages, enforce
trimmed validation and non-disclosing `404` behavior, and soft-delete Note
pages when their parent board is deleted, all without needing the later
frontend/editor/image stories to exist yet.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | Note board/page creation, trimming, content/date constraints, and board delete cascade invariants. |
| Integration | EF model and migration compile, and repository/service proof captures owner-scoped CRUD plus soft-delete filtering. |
| E2E | Not applicable yet. |
| Platform | Windows PowerShell repo-root build/migration workflow remains the expected path. |
| Performance | Not applicable in this backend-foundation story. |
| Logs/Audit | Validation records whether any proof was constrained by unrelated dirty-worktree or runtime blockers. |

## Fixtures

- Existing authenticated-user test fixtures from backend unit/application tests.
- One owned board with active pages.
- One foreign-user board/page for `404` proof.

## Commands

```text
dotnet test src/backend/FluentA.Domain.UnitTests/FluentA.Domain.UnitTests.csproj --filter Note
dotnet test src/backend/FluentA.Application.UnitTests/FluentA.Application.UnitTests.csproj --filter Note
dotnet build src/backend/FluentA.API/FluentA.API.csproj --no-restore
dotnet tool run dotnet-ef migrations add <NoteMigrationName> --project src/backend/FluentA.Infrastructure --startup-project src/backend/FluentA.API
```

## Acceptance Evidence

- `dotnet test src/backend/FluentA.Domain.UnitTests/FluentA.Domain.UnitTests.csproj --filter Note --no-restore`
  passed 3 Note-focused domain tests covering trimming, content/date
  normalization, and board-delete cascade semantics.
- `dotnet test src/backend/FluentA.Application.UnitTests/FluentA.Application.UnitTests.csproj --filter Note --no-restore`
  passed 4 Note-focused application tests covering owned CRUD, newest-first
  board listing, validation errors, and non-disclosing `NOTE_*_NOT_FOUND`
  behavior.
- `dotnet build src/backend/FluentA.API/FluentA.API.csproj --no-restore`
  passed after wiring the new Note bounded context, repository, controller, EF
  mappings, and DI registrations. The build emitted the existing
  `Microsoft.OpenApi 2.0.0` `NU1903` warning.
- `dotnet tool run dotnet-ef migrations add AddNoteWorkspaceFoundation
  --project src/backend/FluentA.Infrastructure --startup-project
  src/backend/FluentA.API` succeeded and generated migration
  `20260709072143_AddNoteWorkspaceFoundation`.
- The generated migration adds `note_boards` and `note_pages`, links boards to
  `auth_users` with cascade delete at the database boundary, keeps page-to-board
  foreign keys `Restrict`, and relies on the Note service/repository layer for
  soft-delete lifecycle semantics.
