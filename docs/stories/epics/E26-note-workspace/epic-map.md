# Epic Map: Note Workspace

Mode: `high_risk_feature`

## Feature Outcome

FluentA exposes a new authenticated `/notes` workspace where each user manages
owner-scoped Note boards and Note pages, writes one sanitized rich-text
document per page, autosaves content on blur and page switches, uploads pasted
or dropped images through the shared asset runtime, and marks removed Note
images for cleanup without storing base64 HTML payloads.

## Architecture / Reality Basis

- `SPEC.md` section 25 already defines the first-release Note boundary,
  proposed API routes, locked autosave/image constraints, and the initial story
  queue.
- `src/frontend/src/App.tsx` currently has no `/notes` route, so Note must join
  the existing top-level protected route model rather than nesting inside
  Journal or Vocabulary.
- `src/frontend/src/routes/workspace/WorkspacePage.tsx` already provides the
  closest shipped board/page navigation pattern, but its content area and API
  assumptions are vocabulary-table specific.
- `src/frontend/src/routes/journal/JournalPage.tsx` and
  `JournalRichTextEditor.tsx` already prove a rich-text editor surface with
  visible save-state affordances, while the backend `JournalContentProcessor`
  already sanitizes and persists HTML.
- Shared asset APIs already support owner-scoped presign/finalize/delete flows
  for `avatar` and `countdown-cover`, plus recurring cleanup for abandoned or
  retired assets; Note should extend that seam instead of introducing a custom
  binary upload route.
- `docs/stories/epics/E25-settings-route-split` already uses `E25`, so Note
  must use a new durable epic identifier. This plan assigns Note Workspace to
  `E26`.

## Epics

| Epic | Capability / Risk Area | Why It Exists | Stories | Proof Needed |
| --- | --- | --- | --- | --- |
| E26-A | Note domain, persistence, and ownership-safe API | Establish the new bounded context, schema, soft-delete lifecycle, and CRUD routes before the UI can depend on real state | US-NOTE-001 | domain/application tests, migration review, owned/foreign/deleted API proof |
| E26-B | Protected Note workspace shell and navigation | Add the `/notes` route, main navigation item, empty states, and board/page shell aligned to the shipped protected-route model | US-NOTE-002 | route/nav proof, shell interaction tests, board/page creation and selection checks |
| E26-C | Rich-text editor reuse and autosave safety | Reuse Journal editor behavior while honoring blur save, page-switch save, save-state feedback, and blank new-page behavior | US-NOTE-003 | frontend interaction tests, reload proof, race-condition checks, sanitized content proof |
| E26-D | Embedded image upload and cleanup lifecycle | Extend shared assets to Note images, persist reload-safe references, and mark removed images for cleanup per `D3` | US-NOTE-004 | asset upload/finalize/delete proof, base64 rejection, cleanup reconciliation evidence |
| E26-E | Release reconciliation | Close doc, matrix, regression, and lifecycle gaps across navigation, CRUD, editor persistence, sanitization, and asset cleanup | US-NOTE-005 | focused E2E, static contract audit, matrix evidence, release smoke |
| E26-F | Workspace presentation parity | Align the shipped Note rail, creation dialogs, context actions, and editor header with Vocabulary without changing Note data behavior | US-NOTE-006, US-NOTE-007 | focused UI behavior, shared-editor regression, responsive browser proof |

## Story Queue

| Story | Epic | Outcome | Depends On | Feasibility Status |
| --- | --- | --- | --- | --- |
| US-NOTE-001 | E26-A | Note boards and pages exist as owner-scoped durable records with CRUD API routes, soft-delete behavior, and non-disclosing `404` semantics | none | Ready to validate as the first story |
| US-NOTE-002 | E26-B | `/notes` is a protected main workspace route with Note navigation, empty states, and board/page shell behavior backed by the real API | US-NOTE-001 | Ready after domain/API ownership lands |
| US-NOTE-003 | E26-C | Note pages reuse the Journal editor boundary with blur save, page-switch autosave, save-state feedback, and blank new-page opening | US-NOTE-001, US-NOTE-002 | Ready after shell and page detail loading exist |
| US-NOTE-004 | E26-D | Pasted or dropped Note images upload through shared assets, survive reload, reject base64 persistence, and mark removed images for cleanup | US-NOTE-001, US-NOTE-003 | Needs feasibility validation for link-reconciliation and cleanup boundary |
| US-NOTE-005 | E26-E | Release proof confirms navigation, CRUD, sanitization, autosave, image upload, and cleanup expectations across docs and matrix rows | US-NOTE-001, US-NOTE-002, US-NOTE-003, US-NOTE-004 | Ready after all delivery stories land |
| US-NOTE-006 | E26-F | Notes uses the Vocabulary-aligned rail and selected-page title/date composition without counters | US-NOTE-005 | Implemented |
| US-NOTE-007 | E26-F | Notes uses Vocabulary-style creation dialogs and context-action focus while the complete borderless editor toolbar moves into the selected-page header | US-NOTE-006 | Implemented; focused tests, isolated build, and four-width browser proof passed |

## Current Story Delivered

`US-NOTE-007` - Aligns Notes creation and context-action presentation with
Vocabulary, then move the existing formatting toolbar into the selected-page
header and remove the editable canvas border.

Why now:

- The user approved exact Vocabulary parity for creation, rename, and deletion
  presentation without changing the existing Note CRUD contracts.
- The selected editor header currently leaves the full toolbar below it and the
  focused canvas shows an unwanted border.
- The requested change can stay frontend-only if the shared editor keeps its
  existing inline default for Journal and Notes uses an optional placement seam.
