# US-VOCAB-009 Execution Plan

## Objective

Ship safe Board/Page/Word deletion and exact Vocabulary create/delete success
feedback on top of the validated E28 layout.

## Milestones

1. **Primitive and state validation**
   - Confirm focused overlay/toast packages against React 19 and decision 0046.
   - Prove newest-at-bottom toast ordering, timed/explicit dismissal, accessible
     dialog focus, and context-trigger removal behavior.
   - Define the typed delete-target and replacement-selection state machine.
2. **Shared behavior primitives**
   - Add repository-owned context-menu, alert-dialog, tooltip, and toaster
     wrappers.
   - Mount exactly one toast viewport at the app root.
   - Add focused semantic/focus tests.
3. **Board and Page deletion**
   - Add right-click target selection and exact menu actions.
   - Add confirmation, pending guard, existing API calls, cache invalidation,
     newest replacement selection, and true final empty states.
4. **Word confirmation and feedback**
   - Replace `window.confirm` with the shared modal.
   - Add specific success toasts to the six eligible create/delete mutations.
   - Prove autosave and preference persistence emit no toast.
5. **API-backed proof and reconciliation**
   - Run targeted backend cleanup regression, frontend checks, and focused
     Chromium flows.
   - Capture focus, placement, stacking, dismissal, replacement, and empty-state
     evidence.
   - Reconcile product docs, validation, Harness rows, and final diff checks.

## Stop Conditions

- Stop if implementation requires a new delete endpoint, schema change, or
  cascade/domain change.
- Stop if right-click target selection conflicts with existing active Board/Page
  loading in a way that changes the approved selection behavior.
- Stop if the chosen overlay/toast runtime conflicts with React 19 or the
  focused-package design-system decision; return to validation rather than
  adding a custom parallel UI runtime.

## Done Signal

The story is implemented only when the real API-backed path deletes the exact
confirmed target, replacement selection is deterministic, all approved and
excluded toast triggers are proven, accessibility evidence is recorded, and
the E28 contract/Harness state agree.
