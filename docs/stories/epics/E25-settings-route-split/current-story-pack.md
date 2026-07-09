# Current Story Pack: US-SETTINGS-004 Level 5 Release Reconciliation

## Epic

E25 Settings Route Split

## Entry State

- `history/settings-route-split/CONTEXT.md` locks the split-route and Level 5
  in-shell contract for Feature 24.
- `US-SETTINGS-002` already moved Level 5 into the shared Settings shell and
  `US-SETTINGS-003` already finished the explicit-save cutover for Profile,
  Practice, and Review.
- `src/frontend/src/routes/settings/LevelFiveSettingsPage.tsx` is live under
  `/settings/level5`, but focused proof still needs to show its existing
  filter/search/remove semantics survived the shell move.
- `src/frontend/src/App.test.tsx` currently proves route rendering and active
  nav state, but not Level 5 management interactions.
- Product docs and matrix evidence still need final reconciliation to the
  shipped split-route Settings contract.

## Exit State

Feature 24 has release-grade proof. Level 5 remains functional inside the
shared Settings shell with unchanged filter, search, single remove, and bulk
remove semantics, and the split-route Settings docs/story evidence match the
shipped behavior across Profile, Practice, Review, and Level 5.

## Proposed Contract

### Level 5 Behavior

- `/settings/level5` remains the global Level 5 management surface.
- Level 5 still supports `All`, `Active`, and `Inactive` filters.
- Level 5 still filters by word search text.
- Single remove still turns one active word inactive without deleting history.
- Bulk remove still acts on the selected active words and clears selection
  after success.
- Inactive words remain visible in the UI when the filter includes them.

### Release Reconciliation

- Split-route Settings docs should describe `/settings/profile`,
  `/settings/practice`, `/settings/review`, and `/settings/level5`.
- Existing focused route tests should remain green after Level 5 proof is added.
- Browser proof should be attempted through the repo's local Playwright surface
  if the frontend/backend runtime is available in this environment.

## Planning Decisions

- Keep Level 5 implementation behavior unchanged unless proof exposes a real
  regression.
- Add focused Level 5 interaction coverage instead of broadening the story into
  other settings refactors.
- Treat browser proof as best-effort against the repo's actual Playwright
  surface and document precisely if runtime prerequisites block it.

## Files Likely Touched

- `src/frontend/src/routes/settings/LevelFiveSettingsPage.tsx`
- focused settings route tests under `src/frontend/src/routes/settings/`
- `src/frontend/src/App.test.tsx`
- `src/frontend/e2e/learning-navigation.spec.js` or another focused Settings
  browser proof file if runtime proof is feasible
- `docs/product/authentication.md`
- `docs/product/learning-workflows.md`
- `docs/stories/epics/E25-settings-route-split/**`
- Harness durable records through `scripts/bin/harness-cli.exe`

## Feasibility Assumptions

| Assumption | Risk | Proof Needed |
| --- | --- | --- |
| Level 5 shell integration did not weaken filter/search/remove semantics | Medium | focused interaction tests for filter, search, single remove, and bulk remove |
| Existing docs only need reconciliation, not a contract change | Low | doc scan against shipped routes and behavior |
| Browser proof can still run from the repo's Playwright surface | Medium | focused e2e attempt or explicit blocked-evidence note |

## Verification

- Focused frontend tests for shared-shell routes plus new Level 5 behavior
  coverage.
- Frontend lint and build.
- Focused browser proof for Settings routing/Level 5 if the local frontend and
  backend runtime are available.
- Harness matrix refresh for the new settings stories after implementation.

## Out Of Scope

- New Level 5 filters, transitions, or API behavior.
- Practice/Review/Profile behavior changes already handled in prior stories.
- Mobile settings navigation.

## Bead Mapping

The external `br` and `bv` tools are unavailable in this environment. Use one
bounded reconciliation pass for `US-SETTINGS-004`, close with focused Level 5
proof, and record any runtime limitation explicitly if browser proof cannot run.
