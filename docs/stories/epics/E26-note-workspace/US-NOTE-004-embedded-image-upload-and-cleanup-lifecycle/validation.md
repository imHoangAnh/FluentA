# Validation

## Proof Strategy

Prove that Note image upload works through the existing shared asset runtime,
persists reload-safe references instead of base64 payloads, and marks removed
Note-owned images for cleanup without breaking current Note save behavior.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit / Application | Shared asset type validation, Note-safe image sanitization, base64 rejection/stripping, and removed-image reconciliation semantics. |
| Route / Component | Pasted or dropped image upload success/failure, Note-local error state, and save-state preservation with mocked Note and asset APIs. |
| E2E / Runtime | Focused proof that an uploaded Note image renders after reload and removed images enter the cleanup lifecycle. |
| Platform | Windows PowerShell backend test plus frontend Vitest/build path remains the expected proof surface. |
| Performance | Not a dedicated target in this story. |

## Commands

```text
dotnet test src/backend/FluentA.Domain.UnitTests/FluentA.Domain.UnitTests.csproj --filter "Asset|Note"
dotnet test src/backend/FluentA.Application.UnitTests/FluentA.Application.UnitTests.csproj --filter "Asset|Note"
dotnet build src/backend/FluentA.API/FluentA.API.csproj --no-restore
npm --prefix src/frontend test -- --run src/routes/notes/NotesPage.test.tsx
npm --prefix src/frontend test -- --run src/App.test.tsx
npm --prefix src/frontend run build
```

## Feasibility Readiness

### Reality Gate

```text
REALITY GATE REPORT
Mode: high_risk_feature
Current work: Add Note pasted/dropped image upload, reload-safe persistence, and removed-image cleanup through shared assets.
MODE FIT: PASS
REPO FIT: PASS
ASSUMPTIONS: PASS
SMALLER PATH: PASS
PROOF SURFACE: PASS
Decision: proceed
Evidence: current-story-pack.md; src/frontend/src/routes/notes/NotesPage.tsx; src/frontend/src/lib/api/assets.api.ts; src/backend/FluentA.Application/BoundedContexts/Assets/AssetService.cs; src/backend/FluentA.Domain/BoundedContexts/Assets/Enums/AssetType.cs; src/backend/FluentA.Application/BoundedContexts/Note/NoteService.cs; src/backend/FluentA.Infrastructure/Journal/JournalContentProcessor.cs; docs/product/notes.md; SPEC.md Section 25
```

### Feasibility Matrix

```text
FEASIBILITY MATRIX
Part / Assumption | Risk | Proof Required | Evidence | Result
Existing Note route can host paste/drop upload without replacing the editor | Medium | Confirm current Note draft host owns content and save sequencing | NotesPage already owns Note title/content draft plus current save flow; JournalRichTextEditor remains a bounded child surface | PASS
Shared asset runtime can extend to a Note image type instead of a custom upload endpoint | High | Confirm asset type parsing and frontend helpers are centralized today | AssetService, AssetType, and assets.api.ts already centralize shared asset-type handling, but currently only support avatar and countdown-cover | PASS
Current Note persistence boundary needs explicit image-safe sanitization work | High | Confirm Note is not already safely preserving images | NoteService currently stores raw content and JournalContentProcessor does not allow img tags, so this story can define the missing safe path explicitly | PASS
Removed-image cleanup can be driven from save-time reference reconciliation | High | Confirm D3 is scoped to saved Note content, not ephemeral editor state | CONTEXT.md locks cleanup on image removal plus save, which matches durable previous-vs-next content reconciliation | PASS
```

### Constraints

- Do not add a Note-specific binary upload endpoint.
- Do not allow persisted base64 image payloads to bypass the backend boundary.
- Do not couple cleanup to transient editor-only removals before the Note save
  succeeds.
- Preserve current Note save-state and draft-retention behavior from
  `US-NOTE-003`.

### Validation Outcome

`IMPLEMENTED`

## Acceptance Evidence Captured

- `dotnet test src/backend/FluentA.Application.UnitTests/FluentA.Application.UnitTests.csproj --filter "Asset|Note"`
  passed 20 focused tests covering shared asset type validation, Note content
  processing, base64 rejection, and removed-image reconciliation semantics.
- `dotnet build src/backend/FluentA.API/FluentA.API.csproj --no-restore`
  passed after wiring the Note image asset type, Note content processor, and
  save-time cleanup marking. The build emitted the existing `Microsoft.OpenApi`
  `NU1903` warning only.
- `npm --prefix src/frontend test -- --run src/routes/notes/NotesPage.test.tsx`
  passed 7 focused Note route tests covering existing save safety plus dropped
  image upload success and upload-failure error handling.
- `npm --prefix src/frontend test -- --run src/App.test.tsx` passed 12 route
  regression tests, keeping the shared `/notes` route and protected nav
  coverage green.
- `npm --prefix src/frontend run build` passed after adding Note image upload
  helpers and editor insertion support, with the existing Rolldown/SignalR
  warnings still present but non-blocking.
