# Exec Plan

## Goal

Deliver the approved Week v2 presentation, server-owned Duplicate command, and
final Todo redesign release proof after `US-TODO-005`.

## Risk Classification

Lane: `high-risk`

Risk flags:

- Week replaces a shipped drag/reorder/move surface;
- Duplicate copies hidden recurrence and reminder state;
- one row must retain pointer, keyboard, selection, and independent-control
  behavior while showing only three controls;
- seven columns plus a shared details panel create overflow risk;
- the story is the release boundary for all four Todo redesign stories.

## Implementation Sequence

1. Add and test the owner-scoped Duplicate service/controller command with
   full field copy, new identity, same date, next order, and incomplete state.
2. Add Week range formatting and table tests for same-month, cross-month, and
   cross-year labels.
3. Replace the global Week quick add with one title-only form per weekday.
4. Rebuild Week rows around completion, selectable wrapping title, and
   icon-only importance while retaining native desktop drag/drop.
5. Add the right-click/Shift+F10 menu with server Duplicate, explicit Move
   submenu, and confirmed Delete.
6. Mount the shared details panel beside Week, keep it open through mutations,
   and update both range/list caches after create/duplicate/update/delete.
7. Implement equal-column/local-scroll/4:1 layout rules and no page-overflow
   assertions at the approved widths.
8. Reconcile final product docs, validate all Todo/Notification/job behavior,
   close Harness evidence, and make one local smart commit without push.

## Checkpoints

1. **Duplicate:** owner copy contains title/note/importance/Repeat/Reminder,
   receives a new id, stays on the same date, and starts incomplete.
2. **Interaction:** every day can quick-add; title selects details; all three
   row controls remain independent; context Duplicate and Move are keyboard
   reachable; drag/reorder/move/delete persist.
3. **Layout:** seven equal columns, wrapped titles, 4:1 details, local narrow
   scroll, and no page-level overflow are proven by DOM assertions/screenshots.
4. **Release:** US-TODO-003 through 006 product/API/runtime contracts, migration
   state, focused/full tests, Chromium, logs, Harness, and dirty-tree hygiene
   all align.

## Rollback Shape

Duplicate is additive and Week is a presentation replacement. Before release,
revert the story commit to restore the prior Week component while leaving the
003-005 data/API additions intact. No database rollback is required.
