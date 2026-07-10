# US-NOTE-002 Design

## Repo Reality

- `App.tsx` owns top-level protected route registration, so `/notes` must join
  that list directly.
- Protected navigation is duplicated across several route components. A full
  shared-shell extraction would expand scope and risk unrelated regressions.
- `WorkspacePage.tsx` demonstrates the nearest board/page interaction pattern
  but is coupled to vocabulary column preferences and table rendering.
- `JournalPage.tsx` demonstrates guarded async detail loading and save-state UX,
  but rich-text editing itself is out of scope here.

## Planned Shape

- Add a dedicated `NoteWorkspacePage` under `src/frontend/src/routes/notes/`.
- Add `src/frontend/src/lib/api/note.api.ts` for Note DTOs and route calls.
- Reuse the existing app visual language for sidebar navigation and content
  panels, while keeping the content panel intentionally lightweight.
- Track three frontend states explicitly:
  no boards, board selected with no pages, page selected and detail loaded.

## Data Flow

1. Route enters `/notes`.
2. `listBoards()` loads owner-scoped boards with lightweight page summaries.
3. The client derives the active board and page from local selection plus the
   returned payload.
4. Selecting a page triggers `getPage(pageId)` for durable detail.
5. Creating a board invalidates Note board queries and selects the new board.
6. Creating a page invalidates board queries and selects the returned new page.

## Risk Controls

- Keep page editing disabled in this story so there is no unsaved-draft race to
  resolve before `US-NOTE-003`.
- Use guarded selected-id state so refetches or empty responses cannot point
  the UI at a deleted/missing board or page silently.
- Limit nav changes to the existing repeated link blocks that are already part
  of authenticated route proof, avoiding a structural nav rewrite.

## Likely Test Surface

- `App.test.tsx` route/nav assertions.
- A new focused Note page test file for empty state, create flow, and selection
  behavior with mocked API responses.
