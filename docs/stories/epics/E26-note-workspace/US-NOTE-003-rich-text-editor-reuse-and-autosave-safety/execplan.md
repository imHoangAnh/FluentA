# US-NOTE-003 Execution Plan

1. Extend `src/frontend/src/lib/api/note.api.ts` with typed Note page update
   support.
2. Replace the Note placeholder detail card with an editable title plus
   `JournalRichTextEditor` surface in `NotesPage.tsx`.
3. Add Note dirty-state, save-state, blur-save, and page-switch-save logic that
   honors `D1` and preserves drafts on failure.
4. Keep blank new-page open behavior intact for `D4`.
5. Add focused Note route tests for blur save, page-switch save ordering,
   failed-save retention, and editable blank-page behavior.
6. Run focused Vitest plus frontend build proof and capture evidence.
