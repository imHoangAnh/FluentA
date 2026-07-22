# Approach: Note Workspace

## Recommended Work Shape

Mode: `high_risk_feature`

Why smaller modes are insufficient:

- The feature introduces a brand-new protected workspace with new domain
  entities, persistence, API routes, and frontend route ownership.
- The feature reuses but also extends two sensitive seams: sanitized rich-text
  persistence and the shared asset lifecycle.
- Locked decision `D3` requires explicit image cleanup behavior, which creates
  data-lifecycle and background-cleanup risk beyond a normal UI slice.
- The work spans backend, frontend, product docs, durable Harness planning, and
  focused validation across unit, integration, browser, and storage boundaries.

Use an epic map and validate the backend ownership/API story first before any
execution beads. Do not start implementation until the Note work shape,
story order, and proof boundaries are approved.

## Recommended Sequence

1. Add a Note bounded context with owner-scoped boards and pages, soft-delete
   lifecycle, and CRUD API routes aligned to the locked `SPEC.md` contract.
2. Add a dedicated Note product contract and the new protected `/notes`
   workspace route plus main navigation entry.
3. Reuse the Vocabulary-style board/page shell so Note can create, rename,
   select, and delete boards/pages before editor reuse lands.
4. Reuse the Journal editor boundary for page content, save-state feedback, and
   page-switch autosave semantics required by `D1`.
5. Add paste/drop image upload through the shared asset API, persist reload-safe
   image references, and reconcile removed images into the cleanup lifecycle
   required by `D3`.
6. Refresh product docs, story evidence, matrix rows, and focused regression
   proof for navigation, ownership, sanitization, autosave, and asset cleanup.
7. Treat later layout parity as frontend-only follow-up stories: first align
   the rail and editor metadata (`US-NOTE-006`), then align creation dialogs,
   destructive-action focus, and the editor-header toolbar (`US-NOTE-007`)
   without reopening Note persistence or asset contracts.

## Rejected Alternatives

1. Extend Journal instead of creating a dedicated Note workspace.
   Rejected because the locked feature boundary requires boards and pages under
   a separate `/notes` route, not date-organized journal entries.
2. Store note images as base64 content inside persisted HTML.
   Rejected because `SPEC.md` explicitly forbids base64 persistence and requires
   reuse of the shared asset boundary.
3. Implement the Note UI first and add the backend later behind mock data.
   Rejected because owner-scoped board/page semantics, soft-delete behavior, and
   page-switch autosave all depend on real API and persistence contracts.
4. Reuse Vocabulary persistence directly for Note pages.
   Rejected because Note content is one rich-text document per page rather than
   a spreadsheet/grid contract, and forcing them together would blur bounded
   context ownership.

## Risk Map

| Component | Risk | Reason | Proof Needed |
| --- | --- | --- | --- |
| Note bounded context and schema | HIGH | New owner-scoped board/page entities and soft-delete cascade must not leak foreign or deleted records. | domain/application tests, migration review, API ownership smoke |
| Protected route and shared navigation | MEDIUM | Adding a new main workspace route can break existing nav highlighting or protected routing assumptions. | router test coverage plus focused browser navigation proof |
| Journal editor reuse for Note | HIGH | Reusing the editor while changing save timing from Journal autosave to blur/page-switch save can introduce race conditions and stale draft overwrites. | focused frontend tests for blur save, page-switch save, error retention, and reload proof |
| Shared asset upload reuse | HIGH | Paste/drop uploads add a new asset consumer and must still obey ownership, allowed types, finalize rules, and storage-unavailable behavior. | asset API proof, frontend upload interaction proof, runtime reload proof |
| Removed-image cleanup lifecycle | HIGH | `D3` requires note content diff/reconciliation semantics that can accidentally delete live assets or leak orphaned ones if defined loosely. | feasibility validation for link tracking plus cleanup proof against removed vs still-referenced images |
| Product-doc and matrix drift | MEDIUM | Note adds a new product surface and contract; stale docs would leave future work guessing. | dedicated product doc plus Harness matrix/story alignment before closeout |

## Likely File Boundaries

- Backend bounded context and services:
  `src/backend/FluentA.Domain/BoundedContexts/Note/**`,
  `src/backend/FluentA.Application/BoundedContexts/Note/**`
- Backend persistence and API:
  `src/backend/FluentA.Infrastructure/Persistence/**`,
  `src/backend/FluentA.Infrastructure/DependencyInjection.cs`,
  `src/backend/FluentA.API/Controllers/**`
- Frontend routes/components/api:
  `src/frontend/src/App.tsx`,
  `src/frontend/src/routes/notes/**`,
  `src/frontend/src/lib/api/**`
- Reused editor and upload seams:
  `src/frontend/src/routes/journal/JournalRichTextEditor.tsx`,
  `src/frontend/src/lib/api/assets.api.ts`,
  `src/backend/FluentA.Infrastructure/Journal/JournalContentProcessor.cs`
- Product and Harness docs:
  `docs/product/notes.md`,
  `docs/stories/epics/E26-note-workspace/**`

## Discovery Notes

- The local scout helper did not return a usable project snapshot in this
  environment, so planning used direct repo reads and targeted `rg` discovery.
- gkg-backed discovery was not available through callable tools in this turn,
  so this plan uses the repo-local fallback path: `CONTEXT.md`, targeted code
  reads, product docs, and existing epic-map patterns.
- Journal already stores sanitized HTML directly through
  `IJournalContentProcessor` and `JournalContentProcessor`; Note can reuse that
  durable format rather than inventing a second editor representation in the
  first release.
- Shared asset upload is already exposed through presign/finalize/list/delete
  API flows for avatar and countdown-cover, which makes asset-type extension a
  more believable path than adding a note-specific upload endpoint.

## Validation Ladder

1. Backend Note domain and application tests for ownership, validation,
   not-found behavior, and soft-delete cascade expectations.
2. Backend API build plus focused integration or runtime smoke for board/page
   CRUD and foreign/deleted `404` behavior.
3. Frontend route/component tests for `/notes` navigation, board/page shell,
   blur save, page-switch autosave, and error-state retention.
4. Shared asset upload proof for paste/drop image success, finalize failure,
   base64 rejection, and removed-image cleanup behavior.
5. Frontend build and focused Playwright/browser proof for end-to-end Note
   creation, editing, switching, reload persistence, and nav highlighting.
6. Harness matrix refresh, story evidence, and release reconciliation.

## Open Checks For The First Story

- Confirm the exact Note table split and whether one `notes_boards` +
  `notes_pages` pair is enough without a third link table.
- Confirm the list payload needed by the workspace shell so
  `GET /api/v1/notes/boards` can serve both board navigation and lightweight
  page summaries without forcing N+1 page-detail loads.
- Confirm the asset-type extension needed for Note images and whether cleanup
  should operate through direct save-time link reconciliation, deferred cleanup
  markers, or both.
