# US-UI-006 Design

## Implementation Shape

1. Refine `AppShell.tsx` dimensions and move the existing collapse state action
   into the logo row. Preserve the 1100 px forced-collapse contract.
2. Give the AppShell content column and Vocabulary route an explicit
   min-height/height chain so nested `min-h-0` and `overflow-*` regions can own
   scrolling without document growth.
3. Convert the Vocabulary two-column workspace to consume the available route
   height. Keep the rail header outside its overflow container.
4. Keep the page toolbar outside the Word-row scroll owner. Put the column
   header at the top of the table's vertical scroll region with sticky
   positioning and preserve the horizontal scroll owner around the complete
   grid.
5. Preserve computed grid tracks and resizable widths. Add adaptive vertical
   dividers to each cell boundary rather than a fixed black raw color.
6. Use content-measured text editors that resize only themselves. The grid row
   naturally clears the tallest cell, but short controls retain their own
   compact height. Re-measure on controlled-value changes and width changes
   without changing mutation timing.
7. Replace the Board eyebrow/Table View action with the approved toolbar and
   disabled, accessibly described placeholders.

## State And Contract Preservation

- Do not change React Query keys, API inputs, Word DTOs, preference DTOs, or
  mutation ordering.
- Autosize is presentation-only. Blur still commits; Escape restores confirmed
  state; queued same-cell saves remain serialized; navigation semantics remain
  unchanged.
- Horizontal overflow remains available for the full fixed-column width even
  while Word rows own vertical scrolling.
- Compact shell dimensions must not introduce per-route AppShell forks.

## Failure Handling

- Existing inline autosave error and Retry behavior remain visible inside the
  content-sized cell.
- Loading, empty Board, empty Page, and create forms must remain reachable
  within the bounded layout.

## Expected Tests

- Add focused AppShell component coverage or strengthen `App.test.tsx` for
  collapse placement, accessible name, and responsive classes.
- Extend `VocabTable.test.tsx` for wrapped editors, independent control sizing,
  dividers, and preserved autosave/keyboard behavior.
- Add route/component proof for exact toolbar composition and scroll-owner
  classes/behavior.
- Add `e2e/app-shell-layout.spec.js` for representative routes at desktop and
  tablet.
- Add the layout/long-content scenarios of
  `e2e/vocab-workspace-polish.spec.js`.
