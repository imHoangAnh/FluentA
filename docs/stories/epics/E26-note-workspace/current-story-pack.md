# Current Story Pack: US-NOTE-005 Note Workspace Release Proof And Reconciliation

## Epic

E26 Note Workspace

## Entry State

- `history/note-workspace/CONTEXT.md` locks page-switch save (`D1`),
  board-delete cascade (`D2`), removed-image cleanup (`D3`), and blank new-page
  opening (`D4`).
- `US-NOTE-001` through `US-NOTE-004` are implemented in code and recorded in
  Harness.
- `docs/product/notes.md` now describes the shipped first-release Note
  contract, including Note image upload and cleanup expectations.
- The Note route already has focused frontend tests and targeted backend Note
  coverage, but there is not yet a focused browser release-proof spec for the
  full Note workflow.
- `.agent-workflow/state.json` still points at the completed `US-NOTE-004`
  execution surface and must be advanced to the release-proof story.

## Exit State

Feature 25 has one release-proof slice that reconciles the shipped Note code,
product docs, Harness matrix rows, and focused regression evidence across
navigation, owner-scoped CRUD, autosave, sanitization, image upload, and
removed-image cleanup.

## Proposed Contract

### Release Scope

- The `/notes` route is reachable from protected navigation and remains
  anonymous-protected.
- Note boards and pages remain owner-scoped across create, read, update, and
  soft-delete behavior already shipped in earlier stories.
- Note page autosave still preserves the locked `D1` page-switch save rule and
  visible save-state feedback.
- Note HTML persistence still rejects unsafe or base64 image payloads while
  preserving safe uploaded image markup.
- Removed Note images remain marked for cleanup only after a save removes their
  durable reference.

### Proof Expectations

- Release proof uses the narrowest believable surface: focused backend Note
  tests, focused frontend Note route tests, app route regression coverage, API
  and frontend builds, and one focused Note browser smoke.
- Browser proof must cover at least one real authenticated Note workflow that
  creates a board/page, edits content, proves reload-safe persistence, uploads
  an image through the shared asset runtime, and confirms removed-image cleanup
  semantics or their durable marker.
- Product docs and Harness matrix evidence must match the actual shipped Note
  behavior by the end of the story.

### Reconciliation Rules

- `US-NOTE-005` should prefer proof and release reconciliation over new feature
  scope.
- If release proof uncovers a Note gap, fix only what is required to satisfy
  the locked Feature 25 contract and capture the proof in this story.
- Do not widen the feature into rename/delete UI, search, tags, sharing,
  templates, or file-picker uploads.

## Planning Decisions

- Treat `US-NOTE-005` as a release-proof story, not a fresh feature-delivery
  slice.
- Add a focused Note Playwright smoke if no existing browser proof covers the
  shipped Note workflow end to end.
- Reuse the existing shared asset runtime and Note APIs during browser proof
  instead of test-only private seams.
- Close the story only when docs, matrix evidence, validation, and trace all
  describe the same shipped Note contract.

## Files Likely Touched

- `src/frontend/e2e/**` for focused Note browser proof
- `src/frontend/playwright*.js` only if Note proof needs config support
- `docs/product/notes.md`
- `docs/stories/epics/E26-note-workspace/**`
- `.agent-workflow/state.json`
- `src/backend/**` or `src/frontend/src/**` only if release proof finds a real
  Note contract gap

## Feasibility Assumptions

| Assumption | Risk | Proof Needed |
| --- | --- | --- |
| The shipped Note workflow is stable enough that a focused browser smoke can prove it without reopening earlier story design | Medium | inspect current e2e patterns and Note route behavior |
| Existing Note tests plus one browser smoke are enough to cover the Feature 25 release contract | Medium | verification ladder mapping and contract audit |
| Removed-image cleanup can be observed through durable state, API behavior, or asset lifecycle markers without bespoke debug hooks | High | repo inspection plus release-proof design |
| Release reconciliation can stay scoped to Note docs, proof, and matrix rows without dragging unrelated dirty-worktree changes into the story | Medium | file-by-file discipline and focused validation |

## Verification

- Focused backend Note and asset tests remain green.
- Focused Note route and app route regressions remain green.
- API and frontend builds remain green within the known warning budget.
- One focused Note browser smoke proves navigation, CRUD, autosave persistence,
  image upload, and cleanup-relevant behavior.
- Harness matrix evidence and trace are updated after proof.

## Out Of Scope

- New Note capabilities beyond Feature 25.
- Broad full-suite release testing outside the focused Note surface.
- Cleanup engine redesign beyond the shipped Note asset lifecycle contract.

## Bead Mapping

The external `br` and `bv` tools are unavailable in this environment. If
validation passes, execute `US-NOTE-005` as one focused release-proof slice:
browser smoke, reconciliation fixes if needed, then doc and Harness closeout.
