# Journal and Notes

Accepted by the user on 2026-10-08.

- Keep the current Journal calendar/title search and Notes Board -> Page screens.
- Each user has at most one active Journal per date. Selecting an occupied date
  opens that entry. Deleted entries remain retained and hidden under deletion.md.
- Both new and existing Journals and Note pages auto-save two seconds after an
  edit. Remove Save buttons. A failed save is visible; drafts are in memory only.
- Switching entry/date/page/board or creating another resource while the current
  draft is not saved opens a warning. Stay preserves the draft; Discard and
  continue abandons unsaved changes. Closing/reloading the page uses the browser's
  unsaved-change warning. No offline draft recovery is promised.
- The shared Tiptap editor supports paragraphs, breaks, H1-H6, bold, italic,
  underline, strike, text color, highlight, bullet/ordered lists with ListItem,
  text alignment (including Justify), horizontal rule and editing Undo/Redo.
- No Link, Code, CodeBlock, Blockquote, TaskList/TaskItem, Table or FontSize.
- Images are owned, finalized private R2 uploads for both features. Images occupy
  a separate block, preserve existing text, and allow writing in the next paragraph.
  Manual resizing preserves aspect ratio. Left/Center/Right keep the current size.
  No image Justify, text wrapping, or free X/Y positioning.
- Persist image references, display size and alignment, never temporary upload or
  download URLs. Reject foreign/wrong-type/pending/deleted assets. Retain removed
  images/links and objects using deleted_at, without cleanup or object deletion.
- Existing JPG/PNG/WebP and 2MB upload limits apply to Journal images too.
- Retain current validation: nonempty titles/names and existing length limits.
  An empty title/name pauses saving and is shown as unsaved, not successful.
- Apply schema changes only to a dedicated validation database; final deployment
  and baseline rebuild remain separate work.
