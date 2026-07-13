# US-VOCAB-009 Design

## Implementation Shape

1. Add repository-owned wrappers for Radix context menu, alert dialog, and
   tooltip behavior, plus one app-root toast viewport/provider.
2. Keep a typed pending delete target containing entity kind, ID, name, and
   parent Board ID when required. The modal renders from that captured target;
   it does not infer the target later from possibly changed active state.
3. On Board/Page context-menu open, update the selected IDs first, then expose
   the corresponding destructive action.
4. Add Board and Page delete mutations in `WorkspacePage.tsx` using the existing
   API methods. Disable confirm while pending and update/invalidate React Query
   state only after success.
5. Compute replacement selection from newest-first collections after removing
   the deleted ID. Clear selection only when the relevant remaining collection
   is empty.
6. Lift Word delete intent into modal state in `VocabTable.tsx`; retain the
   current successful cache removal after the existing endpoint resolves.
7. Emit specific create/delete success toasts only from successful mutation
   callbacks. Do not connect the toast helper to `saveCell` or preference
   updates.

## Overlay And Focus Rules

- Context menus open at the pointer and use semantic menu-item roles.
- Alert dialog traps focus, labels title/description, supports Escape/Cancel,
  and restores focus to a surviving trigger when possible.
- Destructive actions use semantic destructive tokens; no raw color or
  browser-native confirm remains in the Vocabulary path.
- Toast viewport is mounted once at app root, fixed bottom-right, and does not
  alter route layout or steal focus.

## Query And Mutation Rules

- Reuse `vocabularyApi.deleteBoard`, `deletePage`, and `deleteWord` unchanged.
- Board success invalidates/updates Board list and removes stale Board detail;
  Page success updates the active Board detail and relevant Word query; Word
  success removes only that Word from the current Word cache.
- Selection transitions occur after a successful delete, never on Cancel or
  failed requests.
- Failed requests keep the target recoverable and do not show a success toast.
  Existing error conventions should be surfaced without inventing a success
  state.

## Expected Tests

- Workspace component tests for right-click selection, exact menu labels,
  target-specific modal copy, Cancel, pending confirm, endpoint arguments,
  replacement selection, and empty states.
- Extend `VocabTable.test.tsx` for modal Word deletion and no `window.confirm`.
- Toast tests for all six eligible create/delete successes and explicit
  exclusions after cell/preference autosave.
- Extend `e2e/vocab-workspace-polish.spec.js` with API-backed multi-Board,
  multi-Page, final-item, Word deletion, and toast scenarios.
- Run targeted `VocabularyServiceTests` to retain proof of backend cleanup
  behavior even though backend source is unchanged.
