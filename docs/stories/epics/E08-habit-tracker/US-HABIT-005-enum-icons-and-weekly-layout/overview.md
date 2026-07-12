# Overview

## Status

Decisions D1-D14 approved on 2026-07-12. Planning is complete and source
implementation remains behind the validation and approval gates.

## Current Behavior

The Habit domain stores optional free-form `color` and `icon` strings. The
Habit form accepts an arbitrary emoji and hex color. The Habit page uses a
narrow left column capped at 420 pixels, shows only a current-streak label and
a separate today toggle in each row, and shows the selected habit's statistics
and monthly calendar on the right. Habit descriptions are editable but are not
rendered in the selected-habit details.

## Target Behavior

Replace free-form Habit styling with a required semantic icon enum, remove
Habit color end to end, and redesign the desktop/tablet Habit page as two
approximately equal columns. Each Habit row aligns seven interactive status
cells with the Monday-through-Sunday header for the selected week. The detail
column shows the selected Habit description between the statistics and monthly
calendar.

## Locked Decisions

- **D1:** Remove Habit `color` from the UI, API, domain model, and database.
  Keep `icon`, but constrain it to a fixed enum.
- **D2:** Persist semantic icon names and map them to Lucide presentation icons
  in the frontend.
- **D3:** Do not delete or transform existing Habit data in the migration. The
  development database will be reset manually; backward compatibility with
  free-form emoji values is not required.
- **D4:** The icon enum contains `Default`, `Book`, `Exercise`, `Water`,
  `Meditation`, `Study`, `Work`, and `Health`.
- **D5:** The Habit list occupies approximately half of the content area. Each
  row shows the seven calendar days of the selected week, Monday through
  Sunday, rather than a rolling seven-day window.
- **D6:** Eligible past and current dates can be checked or unchecked directly
  from their weekly cells. Future and unscheduled Custom-frequency dates are
  disabled. Remove the separate today-toggle button.
- **D7:** Users can navigate to previous and future weeks. Future dates remain
  visible but disabled.
- **D8:** Render a read-only description block between the four statistics and
  the monthly calendar. Do not render the block when the description is empty;
  editing remains in the Habit form.
- **D9:** The create/edit form uses an icon dropdown with an icon and semantic
  label. `Default` is the initial value.
- **D10:** Render the mapped icon in both the left Habit row and the right
  selected-Habit header. Use shared application styling rather than a
  per-Habit color.
- **D11:** Show current streak compactly beside the Habit name, for example
  `Read a book · 🔥5`; do not use a separate streak line.
- **D12:** Mobile redesign is outside this story. Optimize desktop and tablet
  first.
- **D13:** Desktop and tablet both retain an approximately 50/50 two-column
  layout; weekly cells shrink responsively within the left column.
- **D14:** Apply the semantic icon mapping consistently on the Habit page,
  Habit Stats page, and Dashboard Habit widget.

## Feature Boundary

### Included

- Habit icon enum across database, domain, API, and frontend types.
- Removal of the Habit color contract and persistence column.
- Icon selection and rendering on Habit, Habit Stats, and Dashboard surfaces.
- Selected-week navigation and Monday-through-Sunday status cells.
- Direct weekly-cell completion toggles using existing eligibility rules.
- Selected-Habit description placement and desktop/tablet layout changes.
- Contract, migration, automated test, and product-documentation updates.

### Excluded

- Mobile-specific list/detail navigation or layout redesign.
- New streak calculation rules.
- New Habit scheduling or reminder behavior.
- Destructive cleanup of existing Habit or HabitEntry rows.
- Changes to unrelated productivity domains.

## Affected Product Contract

- `docs/product/personal-productivity.md`

## Deferred Technical Questions For Planning

- Select the exact Lucide component mapped to each semantic enum value.
- Define the EF enum string conversion and migration sequence after the planned
  development database reset.
- Establish desktop/tablet proof viewports and minimum weekly-cell sizing.
- Reconcile all request/response fixtures and tests that currently include
  `color` or free-form `icon` strings.

## Approval Gate

Planning and implementation must not begin until the human approves D1-D14 and
the feature boundary above.
