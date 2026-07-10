# US-NOTE-002 Overview

## Story Outcome

Ship the first authenticated `/notes` frontend surface so users can enter Note
Workspace from the main app navigation, see their owned Note boards and pages
from the real Note API, and create/select board and page records from a shell
that is ready for the editor story.

## Why This Story Exists

- `US-NOTE-001` established the backend Note contract, but users still have no
  way to reach Note Workspace from the shipped frontend.
- Later autosave/editor work needs stable board/page selection, route
  ownership, and detail-loading behavior before it can safely wire rich-text
  editing.
- The repo already proves board/page navigation in Vocabulary and protected
  workspace routing elsewhere, so this story can combine those patterns without
  taking on image or editor complexity.

## User-Visible Behaviors

- Authenticated users see a `Notes` navigation entry in the existing protected
  app experience.
- Visiting `/notes` shows a Note Workspace shell.
- Users with no Note boards see a creation-first empty state.
- Users can create a board and then create a page inside it.
- New pages open immediately after creation with a placeholder content panel.
- Selecting an existing page loads its durable detail from the backend and
  shows its title/date metadata plus an editor-coming-next-story placeholder.

## Dependencies

- Requires shipped `US-NOTE-001` Note API and migration.
- Unblocks `US-NOTE-003` editor reuse and autosave behavior.

## Non-Goals

- Editing page rich-text content.
- Page-switch autosave.
- Embedded image upload/cleanup.
- Rename/delete affordances for boards and pages.
