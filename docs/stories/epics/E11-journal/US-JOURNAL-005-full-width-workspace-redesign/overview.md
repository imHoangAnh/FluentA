# Overview

## Status

implemented

## Lane

normal

## Current Behavior

Journal is already rendered inside a full-width, padding-free AppShell route,
but the page adds its own `280px` left margin, `100vh` sizing, and a centered
`768px` editor cap. That duplicates shell geometry and leaves usable space
empty.

The visible header places `My Journal` on the left and search on the right.
Recent-entry rows include an `ENTRY` badge and an additional highlighted
preview. The editor separates Delete from Save, places title/date below that
action strip, keeps formatting inside the editor shell, and renders a bottom
word/character status footer.

## Target Behavior

Authenticated learners receive the approved Journal workspace:

- search is the left-aligned top control and there is no visible `My Journal`
  heading;
- the page fills the AppShell content width and available viewport height;
- a compact left rail contains the calendar and recent entries, while the
  editor expands through all remaining desktop width;
- recent entries show only title and full date;
- title appears first in the editor header, with the editable date below it;
- Save is followed by Delete at the right of the same header;
- save state remains near those actions;
- the formatting toolbar is the next row and the borderless writing surface is
  directly below it;
- the bottom word/character footer is removed; and
- narrow viewports reflow without overlap, clipping, or whole-page horizontal
  scrolling.

All existing create, open, title-search, calendar, rich-text, autosave,
explicit-save, delete-confirmation, ownership, and sanitization behavior remains
unchanged.

## Acceptance Criteria

1. At desktop width, the Journal root occupies all space provided by AppShell;
   the left rail stays compact and the editor grows instead of stopping at a
   centered width cap.
2. The top row contains left-aligned search and no visible `My Journal` text.
3. Each recent-entry control exposes one title and one formatted writing date;
   no `ENTRY` badge or separate preview row is rendered.
4. Editor DOM and visual order is title, date, Save, Delete, formatting toolbar,
   then the content surface. Delete remains confirmation-gated and is available
   only when a persisted entry can be deleted.
5. Autosave status is still announced and visible near the editor actions after
   the footer is removed.
6. The content surface has no idle border or full-canvas focus border, while
   keyboard focus remains visible on actionable controls.
7. The workspace has no whole-page horizontal overflow at 1440, 1024, 768, and
   320 CSS pixels, and all calendar, list, editor, and action controls remain
   reachable.
8. Existing Journal CRUD, search, calendar, rich-text, autosave, and Notes
   editor regression checks continue to pass.

## Affected Users

- Authenticated FluentA learners using Journal on desktop, tablet, or mobile.

## Affected Product Docs

- `docs/product/journal.md`

## Non-Goals

- API, DTO, domain, persistence, migration, or SignalR changes.
- Changing the two-second autosave rule or explicit creation rule.
- Redesigning Notes or changing the shared rich-text editor contract.
- Removing the existing delete confirmation dialog.
- Adding filters, tags, attachments, or another Journal navigation mode.
