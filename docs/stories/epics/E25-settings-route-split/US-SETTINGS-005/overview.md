# Overview

## Status

implemented

## Lane

normal

## Product Contract

FluentA keeps the existing four protected Settings routes and their existing
data/save behavior, while presenting them through the user-approved compact
Settings workspace. Level 5 uses search plus one status-filter dropdown,
rightmost row selection, visible-active select-all, and confirmation before
removal.

## Relevant Product Docs

- `docs/product/authentication.md`
- `docs/product/learning-workflows.md`

## Acceptance Criteria

- The shared Settings layout has a visible heading/description, icon-led
  Profile, Practice, Review, and Level 5 navigation, clear active state, and no
  horizontal page overflow at 320, 768, 1024, or 1440 pixels.
- Profile keeps avatar, full-name, email, bio, validation, retry, and explicit
  save behavior while matching the approved compact presentation.
- Practice keeps mode inclusion, at-least-one guard, sequence reordering,
  draft-on-error, and explicit save behavior in the approved presentation.
- Review keeps daily-limit, recap toggle, draft-on-error, and explicit save
  behavior in the approved row-based presentation.
- Level 5 search is leftmost and a single Filter dropdown to its right exposes
  All, Active, and Inactive.
- Active Level 5 rows have a checkbox in the final column; the header checkbox
  selects or clears all visible active rows and never selects inactive rows.
- `Remove selected` is disabled with no selection, opens a confirmation dialog
  when enabled, calls the existing mutation only after confirmation, preserves
  review history through the existing inactive transition, and clears selected
  rows after success.
- Loading, empty, error, unsaved, saving, saved, and mutation-pending states
  remain understandable and keyboard accessible.
- No API, DTO, schema, migration, route, or cache-key contract changes.

## Non-Goals

- New Profile, Practice, Review, or Level 5 settings.
- Changes to learning algorithms or review history retention.
- Backend or persistence work.
- A new design-system dependency.

## Approved Decisions

The locked `D1` through `D9` decisions are recorded in the epic
`current-story-pack.md` and are the implementation boundary for this story.
