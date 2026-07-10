# US-NOTE-003 Design

## Repo Reality

- `NotesPage.tsx` already holds board/page selection state and fetches the
  active page detail.
- `note.api.ts` currently supports list/create/get only; the Note backend
  already exposes page update via `PATCH`.
- `JournalPage.tsx` already demonstrates:
  request-id guarding for detail loads,
  dirty-state tracking,
  save-status feedback,
  and cached detail refresh after updates.
- `JournalRichTextEditor.tsx` is a reusable rich-text surface with the current
  first-release formatting boundary.

## Planned Shape

- Extend the Note API client with `updatePage()`.
- Replace the Note placeholder panel with a real editor card using:
  title input,
  `JournalRichTextEditor`,
  save button / save status,
  and page metadata.
- Track Note draft state locally:
  `title`, `content`, `isDirty`, `saveStatus`, `openingId`, and a draft version
  guard for out-of-order save completion.
- Introduce a page-selection helper that:
  saves the current dirty page first when required,
  then switches to the requested page,
  and preserves the current draft if the save fails.

## Risk Controls

- Reuse request-order guarding so late detail responses cannot overwrite the
  newly selected page.
- Gate page selection while a switch-save is in flight or keep the pending next
  page buffered until save success is known.
- Keep failed-save state visible and retryable instead of silently clearing the
  draft.
- Do not introduce image handling or sanitizer-surface expansion in this story.

## Likely Test Surface

- `NotesPage.test.tsx` for:
  blur save,
  page-switch save ordering,
  failed-save retention,
  and editable blank-page open behavior.
- `App.test.tsx` remains route/nav regression coverage only.
