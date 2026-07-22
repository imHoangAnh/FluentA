# US-PROD-004 Countdown Compact Card Grid

## Status

implemented — approved behavior delivered and reviewed on 2026-07-21

## Lane

normal

## Product Contract

Refine the existing `/countdowns` page into a compact card-grid experience
without changing its date-only, alert, cover-image, create-only, or delete
contracts.

## Relevant Product Docs

- `docs/product/personal-productivity.md`
- `docs/product/assets.md`

## Approved Decisions

- `CD-D1`: Keep the current create/delete-only workflow, date-only target,
  one-to-five alerts, optional cover image, and existing API contract.
- `CD-D2`: Replace the tall list rows with a compact responsive card grid based
  on the approved visual reference.
- `CD-D3`: Use the title `Countdown` and an icon-only `+` action to open the
  existing create form. Do not add the reference application's `All` tab.
- `CD-D4`: Put an icon-only `...` menu on each card. Its Delete action opens an
  accessible confirmation modal before calling the existing delete endpoint.
- `CD-D5`: Preserve the current design-system colors and provide a stacked,
  overflow-safe layout on narrow viewports.

## Acceptance Criteria

- Upcoming and recently completed countdowns render as compact cards with the
  existing name, cover/fallback visual, target information, and live status.
- The icon-only create action opens the current create form and does not change
  its submitted fields or validation behavior.
- Delete remains available per card through an overflow menu and requires
  explicit modal confirmation.
- No `All` tab, edit action, API change, schema change, or migration is added.
- Desktop and narrow viewport layouts have no horizontal overflow.

## Design Notes

- API: unchanged `/api/v1/countdowns` GET, POST, and DELETE calls.
- Domain rules: unchanged.
- UI surfaces: `CountdownPage`, focused frontend tests, and Countdown E2E proof.

## Implementation Plan

1. Keep React Query keys, create payloads, cover upload, and delete mutation
   unchanged while separating the card action and confirmation state from the
   form state.
2. Render a responsive `countdown-card-grid` with compact cover/fallback cards,
   live status, target metadata, and an icon-only Radix dropdown action.
3. Add a feature-owned confirmation component backed by the shared Radix Alert
   Dialog so focus, Escape, cancel, and confirm behavior are deterministic.
4. Restyle only Countdown-owned selectors in `design-system.css`; do not alter
   the adjacent uncommitted Habit styles.
5. Update focused browser coverage and add page-level component proof for menu
   and modal behavior.

Expected source boundaries:

- `src/frontend/src/features/countdown/pages/CountdownPage.tsx`
- `src/frontend/src/features/countdown/components/DeleteCountdownConfirmationDialog.tsx`
- `src/frontend/src/features/countdown/pages/CountdownPage.test.tsx`
- `src/frontend/src/styles/design-system.css`
- `src/frontend/e2e/countdown-events.spec.js`

Rejected alternatives:

- Do not add an `All` tab because Countdown has no corresponding cross-type
  collection contract.
- Do not keep a permanent visible Delete button because it conflicts with the
  approved compact card scan pattern.
- Do not introduce edit support or a replacement API solely for the redesign.

## Risks And Required Proof

| Risk | Cause and effect | Required proof |
| --- | --- | --- |
| Delete becomes hard to discover or unsafe | Moving the action into `...` can hide it or allow accidental mutation | Accessible menu name plus cancel/confirm browser proof |
| Cover copy loses contrast | Text overlays an arbitrary user image | Scrim plus browser screenshot with covered and fallback cards |
| Shared stylesheet overlap | Habit compact-layout edits already exist in the same file | Path-scoped diff review and `git diff --check` without touching Habit selectors |
| Narrow cards overflow | Long names and alert metadata can exceed the card width | 320/768/1024/1440 viewport checks with long content |

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Focused Countdown component behavior for create and delete confirmation |
| Integration | Not required; no API or persistence change |
| E2E | Card grid, create modal, overflow Delete, confirmation cancel/confirm |
| Platform | Frontend build, focused lint, desktop/narrow overflow screenshots |
| Release | Existing Countdown contract regression remains green |

### Readiness Gate — 2026-07-21

Result: `READY WITH CONSTRAINTS`

| Assumption | Risk | Evidence | Result |
| --- | --- | --- | --- |
| Countdown can be restyled without a contract change | Card redesign could accidentally alter create/delete inputs | `CountdownPage.tsx` calls the existing list/create/delete adapter and the approved plan retains every payload field | READY |
| Accessible menu and confirmation primitives exist | New dependencies or custom focus management might be required | Radix Dropdown Menu is installed; the shared `alert-dialog.tsx` provides focus-managed confirmation | READY |
| Existing browser behavior is green before the edit | A pre-existing failure could be misattributed to the redesign | `countdown-events.spec.js` passed against live API and Vite on 2026-07-21 | READY |
| Shared CSS can be edited safely | The file contains uncommitted Habit refinements | Current diff is limited to Habit selectors; implementation is constrained to Countdown-owned selectors and path-scoped review | READY WITH CONSTRAINT |
| Full build is a reliable baseline | Unrelated dirty files can block TypeScript | Baseline build is blocked by unused `RotateCw` in FlashcardViewerPage and `formatDay` in TodoPage; focused Countdown/Pomodoro lint passed | CONSTRAINT |

## Harness Delta

- Add `US-PROD-004` as a normal follow-up story under the existing Countdown redesign epic.

## Evidence

Implementation and review evidence is recorded in
`US-PROD-004-countdown-compact-card-grid/validation.md`. Focused component
proof, API-backed browser coverage, production bundling, desktop/narrow visual
inspection, overflow checks, and scoped diff review passed. The repository-wide
TypeScript build remains blocked only by the two documented pre-existing dirty
files outside this story.
