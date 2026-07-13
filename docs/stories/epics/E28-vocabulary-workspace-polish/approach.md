# E28 Vocabulary Workspace Polish Approach

## Recommended Path

Deliver the approved change request as one normal-risk initiative with two
dependency-ordered, user-visible stories:

1. Compact the shared AppShell and make the Vocabulary workspace, rail, toolbar,
   and table behave correctly inside a bounded desktop/tablet viewport.
2. Add accessible Board/Page context-menu deletion, shared confirmation for all
   Vocabulary delete actions, deterministic post-delete selection, and scoped
   create/delete success toasts.

The first story establishes the final layout containment before overlays and
toast viewports are added. The second story then proves destructive focus,
selection, cache, and feedback behavior inside that stable layout. Neither
story changes an API, database schema, domain rule, or delete cascade.

## Why This Shape

- Each story has an observable end state that can be reviewed in the running
  application.
- Shared-shell risk is separated from destructive-mutation risk, so layout
  regressions do not obscure delete/cache failures.
- The split preserves one product capability and avoids technical-only stories
  for primitives, CSS, or tests.
- Backend delete behavior is reused rather than rebuilt; the implementation is
  primarily a frontend state, accessibility, and presentation change.

## Rejected Alternatives

1. **One undifferentiated patch.** Rejected because global AppShell changes,
   nested scrolling, autosizing editors, destructive mutations, overlays, and
   notifications would fail on the same proof surface and be difficult to
   isolate.
2. **A Vocabulary-only AppShell fork.** Rejected by D16 and because it would
   create a second shell contract instead of improving the shared component.
3. **New delete endpoints or cascade logic.** Rejected because
   `DELETE /api/v1/boards/{boardId}`, Page delete, and Word delete already own
   the required vocabulary/flashcard/review cleanup.
4. **Browser-native confirm and context behavior.** Rejected because it cannot
   provide the approved modal content, focus management, consistent styling,
   or deterministic automated proof.
5. **Clickable no-op Search/Filter buttons.** Rejected by D17 because they
   falsely signal completed behavior.
6. **Global success notifications.** Rejected by D4; only eligible manual
   Vocabulary create/delete actions participate in this initiative.

## Integration Boundaries

### Shared frontend shell

- `src/frontend/src/components/AppShell.tsx` owns the 56 px header, 184/84 px
  sidebar states, desktop logo-adjacent icon control, and the existing forced
  tablet collapse rule.
- Authentication remains on `AuthShell` and is not changed.
- App-wide route content must remain reachable and must not be clipped by the
  compact shared header/sidebar.

### Vocabulary route and table

- `src/frontend/src/routes/workspace/WorkspacePage.tsx` owns active
  Board/Page state, the independently scrolling rail, viewport containment,
  toolbar composition, Board/Page context menus, delete mutations, cache
  invalidation, and deterministic replacement selection.
- `src/frontend/src/components/vocabulary/VocabTable.tsx` owns sticky column
  headers, vertically scrolling Word rows, adaptive column dividers,
  content-sized editors, Word confirmation, and Word create/delete feedback.
- `ColumnSettings.tsx` keeps its current preference API and autosave behavior.
- `src/frontend/src/lib/api/vocabulary.api.ts` is consumed as-is; no endpoint or
  DTO change is expected.

### Shared behavior primitives

- Add repository-owned UI wrappers for accessible context menu, alert dialog,
  tooltip, and toast presentation under `src/frontend/src/components/ui/`.
- Prefer focused Radix packages for context menu, alert dialog, and tooltip in
  accordance with decision 0046.
- Use a small maintained toast runtime that supports bottom-right stacking,
  explicit close, and timed dismissal; validate the exact dependency and
  bundle effect before implementation. The app root owns the single toast
  viewport so Vocabulary actions do not create duplicate providers.

### Existing backend path

- `BoardsController` delegates Board/Page/Word deletes to `VocabularyService`.
- `VocabularyService` performs owner-scoped lookup, soft deletion, synchronized
  flashcard removal, review-progress cleanup, deck cleanup where applicable,
  and a single save boundary.
- No backend source change is planned. Targeted backend tests remain regression
  proof for the destructive contract surfaced by the new UI.

## Expected Files

Likely modified:

- `src/frontend/package.json`
- `src/frontend/package-lock.json`
- `src/frontend/src/App.tsx`
- `src/frontend/src/components/AppShell.tsx`
- `src/frontend/src/routes/workspace/WorkspacePage.tsx`
- `src/frontend/src/components/vocabulary/VocabTable.tsx`
- `src/frontend/src/components/vocabulary/VocabTable.test.tsx`
- `src/frontend/src/App.test.tsx`
- `docs/product/vocabulary-board.md`

Likely added:

- `src/frontend/src/components/ui/alert-dialog.tsx`
- `src/frontend/src/components/ui/context-menu.tsx`
- `src/frontend/src/components/ui/tooltip.tsx`
- `src/frontend/src/components/ui/toaster.tsx`
- focused Workspace/AppShell component tests if route-level tests cannot prove
  state transitions cleanly
- `src/frontend/e2e/app-shell-layout.spec.js`
- `src/frontend/e2e/vocab-workspace-polish.spec.js`

Exact wrapper names may change during validation to match the selected focused
packages, but the single-provider and repository-owned component boundaries do
not change without approval.

## Risks And Required Proof

| Risk | Cause and effect | Required proof |
| --- | --- | --- |
| Sticky regions fail | A missing bounded ancestor height or wrong overflow owner makes the whole route scroll or unsticks the table header. | Desktop/tablet browser assertions for scroll owners, bounding boxes, and screenshots with long Board/Page and Word fixtures. |
| Long editors regress autosave | Replacing single-line controls or measuring textarea height can change blur, Enter, Tab, Escape, queued-save, or retry behavior. | Existing `VocabTable` tests plus focused wrap/autosize and keyboard/autosave cases. |
| Global shell clips other routes | A shorter header or narrower sidebar can truncate labels/actions or hide route content. | AppShell component assertions plus protected-route desktop/tablet smoke at representative routes. |
| Right-click deletes the wrong target | Selection and async Board loading can diverge from the item stored for confirmation. | Component/E2E proof that the clicked name appears in the modal and only that ID is sent to the API. |
| Post-delete selection becomes stale | Query invalidation and local selected IDs can leave a deleted Board/Page active or show an unnecessary empty state. | E2E fixtures with multiple and final Board/Page cases; assert newest remaining selection and true empty state. |
| Confirmation races or duplicates | Repeated confirm actions can issue duplicate deletes or leave focus trapped. | Pending-state disabled action, single-request assertions, cancel proof, focus restoration, Escape handling. |
| Toast scope leaks into autosave | Reusing mutation callbacks too broadly can emit a toast for every cell blur/preference change. | Unit/E2E assertions for exact create/delete counts and no toast after cell or preference autosave. |
| New dependencies inflate or conflict | Overlay/toast packages can duplicate runtime behavior or materially grow the bundle. | Lockfile review, production build output, and focused dependency inventory. |

## Product Documentation And Decisions

- Update `docs/product/vocabulary-board.md` with the approved context-menu,
  confirmation, scrolling, wrapping, toolbar, and eligible toast behavior.
- Existing delete and learning-cleanup contracts in `vocabulary-board.md`,
  `flashcards.md`, and `learning-workflows.md` remain unchanged.
- Decision `0046-frontend-design-system-and-legacy-css-boundary.md` already
  authorizes repository-owned shadcn-style wrappers and focused Radix packages;
  no new architecture decision is expected unless validation selects a
  conflicting UI runtime or changes the shared-shell boundary.

## Dependency Order

1. `US-UI-006` - Compact AppShell and stabilize the Vocabulary viewport.
2. `US-VOCAB-009` - Add safe destructive actions and scoped success feedback.
3. Reconcile product docs, both validation reports, Harness matrix rows, and
   focused release proof before marking E28 complete.
