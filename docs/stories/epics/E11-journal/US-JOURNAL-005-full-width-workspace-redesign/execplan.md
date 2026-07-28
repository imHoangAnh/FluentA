# Exec Plan

## Goal

Deliver the approved full-width Journal workspace while preserving every
existing Journal data and interaction contract.

## Scope

In scope:

- left-aligned search with no visible `My Journal` heading;
- full AppShell width and available-height usage;
- compact calendar/recent-entry rail and fluid editor;
- title/date and Save/Delete in one editor header;
- formatting toolbar directly above a borderless content surface;
- removal of the bottom statistics footer;
- title/date-only recent-entry rows;
- responsive and overflow-safe behavior; and
- focused unit, browser, build, and shared-editor regression proof.

Out of scope:

- backend, API, schema, migration, authentication, authorization, and realtime
  changes;
- Journal behavior additions beyond the approved presentation changes; and
- changes to Notes layout or the shared editor API.

## Risk Classification

Lane: `normal`.

Concrete risks:

- Existing behavior: moving fields/actions can accidentally break create,
  autosave, delete, search-result selection, or calendar date selection.
- Shared styling: broad toolbar/editor CSS could regress Notes.
- Responsive layout: fixed rail/editor sizing can reintroduce horizontal page
  overflow at tablet or mobile widths.
- Dirty worktree: `JournalRichTextEditor.tsx` and `design-system.css` already
  contain unrelated user-owned changes that must be preserved.

No security, API, database, migration, or compatibility-breaking contract flag
is introduced by the recommended path.

## Dependency-Ordered Work

1. Add focused `JournalPage` tests that describe the approved DOM contract and
   preserve current data interactions.
2. Restructure `JournalPage` markup while leaving query/mutation/autosave logic
   intact.
3. Replace obsolete Journal geometry with AppShell-aware, Journal-scoped,
   responsive layout rules; remove only unused badge/footer rules after markup
   no longer references them.
4. Add deterministic responsive Playwright proof at 1440, 1024, 768, and 320
   widths, including a no-horizontal-overflow assertion.
5. Run focused Journal and Notes regression tests, targeted ESLint, production
   build, existing Journal browser flows when the local stack is available, and
   scoped diff checks.
6. Record validation evidence, update Harness proof flags, and close the story
   only when acceptance criteria and proof agree.

## Observable Exit State

- Opening `/journal` shows search at the left and no visible `My Journal` text.
- The workspace fills the content region to the right of AppShell navigation.
- Calendar/recent entries remain usable while the editor consumes remaining
  width.
- A selected entry shows title, date, Save, then Delete in one header; toolbar
  and content follow; no footer stats are visible.
- Recent entries contain one title and one date only.
- Existing create, edit, autosave, search, calendar, and confirmation-gated
  delete flows still work.
- No tested viewport has whole-page horizontal overflow.

## Stop Conditions

Pause for human confirmation if implementation would require:

- changing a Journal API, DTO, validation rule, schema, or ownership rule;
- changing the global AppShell contract for other routes;
- changing the shared editor API or Notes behavior beyond preserving its
  current worktree state; or
- weakening existing Journal CRUD, search, calendar, autosave, or delete proof.

