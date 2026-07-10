# Validation

## Proof Strategy

Prove Feature 25 with the smallest release surface that still covers the full
Note lifecycle: focused backend Note tests, focused frontend regressions, one
real browser smoke, and durable doc plus matrix reconciliation.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit / Application | Note CRUD ownership, sanitization, base64 rejection, image lifecycle, and cleanup semantics remain green through focused Note and asset tests. |
| Route / Component | `/notes` route protection, board/page shell, autosave, and image-upload behavior remain green in focused Vitest coverage. |
| E2E / Runtime | One authenticated Note browser smoke proves navigation, board/page creation, autosave persistence, image upload with durable references, reload-safe rendering, and cleanup-relevant behavior after removal plus save. |
| Platform | API build, frontend build, and `git diff --check` stay green within the known warning budget. |
| Performance | Not a dedicated target in this story. |
| Logs / Audit | Harness matrix evidence and final trace reflect the actual proof that ran. |

## Fixtures

- Authenticated user with a clean Note workspace or isolated test-created board.
- One image fixture suitable for Note upload through the shared asset runtime.
- Optional durable-state probe path for confirming removed-image cleanup markers
  if the UI does not surface them directly.

## Commands

```text
dotnet test src/backend/FluentA.Domain.UnitTests/FluentA.Domain.UnitTests.csproj --filter Note
dotnet test src/backend/FluentA.Application.UnitTests/FluentA.Application.UnitTests.csproj --filter "Asset|Note"
dotnet build src/backend/FluentA.API/FluentA.API.csproj --no-restore
npm --prefix src/frontend run test:run -- src/routes/notes/NotesPage.test.tsx
npm --prefix src/frontend run test:run -- src/App.test.tsx
npm --prefix src/frontend run build
npm --prefix src/frontend run test:e2e -- notes-workspace.spec.js
git diff --check
```

## Feasibility Readiness

### Reality Gate

```text
REALITY GATE REPORT
Mode: high_risk_feature
Current work: Release-proof Feature 25 Note Workspace across navigation, CRUD, autosave, sanitization, image upload, cleanup, docs, and matrix evidence.
MODE FIT: PASS
REPO FIT: PASS
ASSUMPTIONS: PASS
SMALLER PATH: PASS
PROOF SURFACE: PASS
Decision: proceed
Evidence: history/note-workspace/CONTEXT.md; docs/product/notes.md; docs/stories/epics/E26-note-workspace/current-story-pack.md; src/frontend/e2e/journal-foundation.spec.js; src/frontend/e2e/journal-rich-text-autosave.spec.js; src/frontend/playwright.config.js; src/frontend/src/lib/api/assets.api.ts; src/backend/FluentA.API/Controllers/AssetsController.cs; src/backend/FluentA.Application/BoundedContexts/Assets/AssetService.cs; src/backend/FluentA.Application/BoundedContexts/Note/NoteService.cs
```

### Feasibility Matrix

```text
FEASIBILITY MATRIX
Part / Assumption | Risk | Proof Required | Evidence | Result
The shipped Note flow can be covered by one focused browser smoke without reopening story design | Medium | inspect current Playwright patterns and Note route ownership | Existing Journal and navigation specs already prove the repo's authenticated-register/login, focused CRUD smoke, and direct API spot-check pattern that Note can reuse with one new focused spec | PASS
The shared asset runtime exposes enough public surface to validate Note image upload and cleanup-relevant behavior | Medium | inspect frontend asset helpers and backend asset controller/service seams | assets.api.ts already supports note-image presign and finalize plus asset listing; AssetsController exposes list/presign/finalize/delete through public authenticated endpoints | PASS
Removed-image cleanup can be observed without adding debug-only UI | High | inspect cleanup implementation and list/delete semantics | NoteService marks removed finalized note-image assets deleted during save reconciliation, and AssetService list semantics plus shared asset status model give a durable non-debug observation seam | PASS
Release reconciliation can stay bounded to Note docs, focused proof, and matrix evidence despite the broader dirty worktree | Medium | inspect current touched-file surface and story packet boundaries | Current story packet, docs/product/notes.md, Note tests, and a new Note Playwright spec form a bounded closure surface; unrelated Note-adjacent files can remain untouched unless proof finds a true contract gap | PASS
```

### Constraints

- Do not widen Feature 25 beyond the locked first-release Note contract.
- Do not replace focused proof with a broad unrelated regression sweep.
- Do not add debug-only release surfaces unless validation fails without them.
- Keep cleanup validation tied to durable authenticated behavior or durable
  state seams already present in the shipped asset runtime.

### Validation Outcome

`IMPLEMENTED`

## Acceptance Evidence

- `dotnet test src/backend/FluentA.Domain.UnitTests/FluentA.Domain.UnitTests.csproj --filter Note`
  passed 3 focused domain Note tests.
- `dotnet test src/backend/FluentA.Application.UnitTests/FluentA.Application.UnitTests.csproj --filter "Asset|Note"`
  passed 20 focused application Note and asset tests.
- `dotnet build src/backend/FluentA.API/FluentA.API.csproj --no-restore`
  passed with the existing `Microsoft.OpenApi` `NU1903` warning only.
- `npm --prefix src/frontend run test:run -- src/routes/notes/NotesPage.test.tsx`
  passed 7 focused Note route tests.
- `npm --prefix src/frontend run test:run -- src/App.test.tsx`
  passed 12 protected-route and app regression tests.
- `npm --prefix src/frontend run build` passed with the existing
  Rolldown/SignalR warnings and chunk-size warning.
- `npm --prefix src/frontend run test:e2e -- notes-workspace.spec.js`
  passed 2 focused Playwright tests covering anonymous route protection plus
  the authenticated Note release smoke for board/page create flow, autosave,
  durable image upload, reload-safe persistence, base64 rejection, cleanup
  marking, foreign-user `404`, and board-delete cascade.
- `dotnet tool run dotnet-ef database update --project src/backend/FluentA.Infrastructure --startup-project src/backend/FluentA.API`
  passed and applied `AddNoteWorkspaceFoundation` in the local proof database.
- `git diff --check` passed with existing line-ending warnings only.
