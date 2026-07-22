# Current Story Pack: US-NOTE-007 Vocabulary Parity And Editor Header

## Epic

E26 Note Workspace

## Entry State

- Notes already has owner-scoped Board/Page create, rename, and delete APIs.
- Rename and Delete already use right-click context actions and dialogs.
- Board/Page creation still expands inline forms rather than Vocabulary-style
  modal dialogs.
- `JournalRichTextEditor` owns the complete toolbar and editable surface in one
  shell, so Notes currently renders the toolbar below its title/date/save row.
- The editor canvas shows a focused border the user explicitly rejected.
- The global design-system stylesheet has unrelated worktree edits and is not
  available as a safe story-owned surface.

## Exit State

Notes creates boards and pages through focused modal dialogs, keeps Rename and
Delete on the right-click path with safe focus behavior, renders the complete
existing formatting toolbar between title/date and Saved/Save in the selected
page header, and keeps the document canvas borderless in idle and focused
states. Journal, Note APIs, autosave, images, routes, cache keys, and persistence
contracts remain unchanged.

## Locked Decisions

`D1` through `D6` are recorded in
`US-NOTE-007-vocabulary-parity-and-editor-header.md` and define the authorized
implementation boundary.

## Story

`US-NOTE-007` — Vocabulary Parity And Editor Header

Lane: `normal`

Risk flags:

- Existing behavior.
- Shared editor regression.
- Autosave/focus interaction.
- Responsive overflow.
- Dirty-worktree overlap.

## Proof Shape

- Unit: Notes modal/context/editor/save interactions and default shared-editor
  toolbar behavior.
- Integration: existing React Query CRUD/cache and autosave tests remain green.
- E2E: deterministic Note route proof for create dialogs, right-click actions,
  toolbar header position, formatting, borderless focus, and 320/768/1024/1440
  overflow.
- Platform: targeted lint, production build, scoped diff integrity.

## Stop Conditions

Stop and request direction if the story would require:

- a backend, API, DTO, schema, migration, route, cache-key, or dependency change;
- replacement of the Journal editor engine or duplication of its commands;
- modification of the dirty global `design-system.css`;
- search, tags, sharing, templates, attachments, or Vocabulary behavior changes.

## Delivery State

Implemented and reviewed. Focused Vitest passed 23/23, targeted ESLint passed,
the story-isolated production build passed, and deterministic browser proof
passed at 320, 768, 1024, and 1440 pixels. The global dirty-worktree build
remains blocked outside this story by the unused `RotateCw` import in
`FlashcardViewerPage.tsx:1`; full evidence is recorded in the story validation
artifact.
