# Design

## Recommended Path

Use existing semantic Tailwind utilities and shared `Card`, `Button`, `Input`,
and Alert Dialog primitives. Keep data fetching and mutations in their current
pages. Limit new component extraction to a small Settings-local presentation
component only when it removes repeated status/header markup without hiding
page-specific state.

## Interface Shape

### Shared layout

- `SettingsLayout` owns the visible page heading, description, responsive
  secondary navigation, and route outlet.
- Wide layout: compact navigation column plus flexible main content.
- Narrow layout: navigation moves above content, using one column at the
  320-pixel proof width and two columns once labels have enough space.
- Each navigation item has a Lucide icon, label, and `aria-current="page"` from
  `NavLink`.

### Profile

- Keep the current aggregate settings query, avatar asset upload-on-save,
  finalized-asset retry reuse, and auth/cache update path.
- Replace legacy Settings classes with semantic primitives and utilities.
- Email remains read-only; bio retains its 500-character counter.

### Practice

- Keep `practiceModes`, draft comparison, at-least-one guard, reorder logic,
  mutation, and cache updates.
- Mode tiles use `aria-pressed`; ordered rows use labeled Up/Down buttons and
  disable impossible moves.

### Review

- Keep the local draft and number-input text state, validation path, mutation,
  and cache updates.
- Present daily limit and recap preference as scan-friendly rows.

### Level 5

- Use the installed Radix Dropdown Menu to implement one labeled Filter button
  with All, Active, and Inactive items. No package change is required.
- Render semantic table columns in this order: Word, Source, Status, Last
  review, Select.
- The header checkbox derives checked/indeterminate state from visible active
  word IDs and selected IDs.
- Search/filter changes do not silently select inactive words. Select-all only
  adds or removes the currently visible active IDs.
- A shared Alert Dialog confirms the selected count. The existing
  `removeLevelFiveWords` mutation runs only on confirm; Cancel makes no API call.
- While pending, dismissal and confirm controls are disabled. On success,
  selected items become inactive in the existing query cache and selection is
  cleared.

## Integration Boundary

- Frontend only.
- Existing routes and React Query keys remain unchanged.
- Existing `listLevelFiveWords` and `removeLevelFiveWords` API adapters remain
  unchanged.
- Existing server behavior remains the authority for inactive/history state.

## Alternatives Rejected

1. Add a new dropdown/select dependency.
   Rejected because Radix Dropdown Menu is already installed and used.
2. Keep three filter buttons.
   Rejected because the approved design requires one Filter dropdown.
3. Remove selected words immediately.
   Rejected because the approved design requires confirmation.
4. Add a new bulk-remove endpoint.
   Rejected because the current mutation already accepts multiple word IDs.
5. Modify the dirty global Settings CSS block.
   Rejected because existing semantic utilities can implement the design while
   preserving unrelated worktree edits.

## Risk And Proof

| Risk | Cause | Required proof |
| --- | --- | --- |
| Save-flow regression | Four pages are restyled together | existing plus focused Profile/Practice/Review Vitest |
| Incorrect bulk selection | Filter/search and active state interact | tests for visible select-all, inactive exclusion, clear-all, search/filter changes |
| Destructive action without consent | Existing remove currently runs immediately | Alert Dialog open/cancel/confirm/pending tests |
| Responsive overflow | Sidebar, forms, table, and actions compete for width | browser proof at 320/768/1024/1440 |
| Dirty-worktree overlap | global CSS is already modified | avoid editing it; scoped diff review |
