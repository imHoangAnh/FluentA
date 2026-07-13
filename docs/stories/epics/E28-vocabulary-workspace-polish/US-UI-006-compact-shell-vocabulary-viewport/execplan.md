# US-UI-006 Execution Plan

## Objective

Ship the compact shared AppShell and bounded Vocabulary workspace while
preserving every existing Vocabulary interaction contract.

## Milestones

1. **Baseline and containment spike**
   - Record focused frontend test/lint/build state.
   - Prove the intended AppShell-to-route height chain and table overflow owner
     with a minimal validation fixture.
   - Prove content-sized editor behavior against current keyboard semantics.
2. **Shared shell refinement**
   - Apply approved header/sidebar dimensions.
   - Move the desktop icon-only collapse action beside the logo.
   - Add component and representative-route regression coverage.
3. **Vocabulary viewport and toolbar**
   - Bound the two-pane workspace beneath the compact header.
   - Separate Board/Page tree and Word-row scroll owners.
   - Apply the approved toolbar and disabled placeholders.
4. **Table readability**
   - Add adaptive column dividers and sticky header behavior.
   - Add content-sized wrapped cell controls without inner scrollbars.
   - Preserve horizontal overflow, column resize/reorder, and autosave/keyboard
     contracts.
5. **Proof and documentation**
   - Run focused/full frontend checks and Chromium desktop/tablet scenarios.
   - Visually inspect screenshots with overflowing fixtures.
   - Update the product contract and validation evidence truthfully.

## Stop Conditions

- Stop if correct nested scrolling requires changing route architecture or a
  shared AppShell API beyond the approved dimensions/placement.
- Stop if content-sized controls require changing persisted fields, accepted
  newline behavior, autosave timing, or keyboard navigation.
- Stop if an unrelated dirty-worktree change overlaps a target file and cannot
  be preserved safely.

## Done Signal

The story is implemented only when its acceptance criteria and validation
layers pass, with any pre-existing failures recorded, and `US-VOCAB-009` can
consume the stable layout without reopening D5-D13, D16, or D17.
