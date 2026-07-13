# US-UI-004 Design

## Recommended Composition

All in-scope routes compose the existing `AppShell`. Their query/mutation
hooks, request guards, autosave boundaries, rich-text behavior, asset calls,
and nested routing stay in feature code. Shared components own presentation,
focus/keyboard behavior, semantic variants, and reusable feedback only.

### Journal

- Use AppShell for application navigation and route heading/actions.
- Keep entry discovery and editing as one responsive workspace: search,
  calendar/month navigation, date context, and entry list remain adjacent to a
  dominant editor at desktop width and compact without page-level overflow at
  tablet width.
- Keep `JournalRichTextEditor` feature-owned because its command set, editor
  zoom, image handling, and sanitized HTML are product behavior. Restyle its
  toolbar with shared buttons/toggles without changing commands or HTML.
- Existing entries continue to autosave after two seconds. New entries remain
  unsaved drafts until explicit creation. Do not turn editor blur into a new
  persistence contract.
- Replace `window.confirm` with the established accessible destructive dialog
  pattern while preserving the same delete mutation and selected-entry reset.

### Notes

- Use AppShell around a board/page/editor workspace. Preserve the distinct
  board list, page list, and editor hierarchy; at tablet width, columns may
  compact or use a local scroll region but the page itself must not overflow.
- Keep selected board/page identity and the current save-before-navigation
  sequence in the route boundary. A visual refactor must never switch pages
  before the dirty draft has resolved successfully.
- Rework draft derivation so server page data initializes editor state without
  a synchronous state-update effect. The solution must preserve unsaved edits
  during refetch and remove the current lint finding rather than suppressing
  the rule.
- Keep rich-text image paste/drop through `uploadNoteImageAsset`; expose upload
  pending/error state and durable image references. Do not add a file picker,
  because it is explicitly deferred by the product contract.
- Do not expose API-supported board/page deletion or rename unless the product
  contract is separately approved.

### Notifications

- Use AppShell with an inbox list/card composition and a header-level Mark all
  read action.
- Represent unread state through text/semantic emphasis in addition to color.
  Each unread item is keyboard operable and announces pending/read state.
- Keep the existing `['notifications']` and `['notifications-unread']`
  invalidation boundary. Presentation must not introduce optimistic read state
  unless the current API behavior is characterized and retained.
- Add loading skeleton, empty state, recoverable error feedback, and disabled
  pending actions without inventing notification preferences or delivery
  behavior.

### Settings

- AppShell owns application navigation, brand, notifications, and logout.
  `SettingsLayout` retains only a nested, labeled settings subnavigation and
  `<Outlet>` content boundary.
- Profile uses shared form/card/alert components for name, bio, avatar upload,
  saved assets, validation, retry, success, and errors. Keep the finalized
  asset reuse rule so a failed profile save does not upload the same file twice.
- Avatar deletion uses explicit confirmation and preserves current-avatar
  synchronization with the auth store.
- Practice ordering/toggles, Review daily limit, and Level 5 filtering,
  selection, and removals retain their current mutation/query ownership.
  Tables/lists remain comfortably dense and keyboard operable.

## Shared Primitive Additions

Add only primitives required by these routes and absent from the approved
foundation:

- Dialog/AlertDialog for destructive confirmation;
- Label and Textarea for form semantics;
- Alert for validation, upload, and server feedback;
- Checkbox or Switch only where it matches the existing settings contract;
- Tabs/ToggleGroup only if used for the nested Settings navigation without
  changing URLs;
- Separator/ScrollArea only when native layout and overflow cannot satisfy the
  same accessible behavior.

Use repository-owned shadcn-style components, cva, and `cn`. Do not introduce a
second token set, route-local component framework, or new feature stylesheet.

## State And Integration Boundaries

- API clients and DTOs under `src/frontend/src/lib/api/` remain unchanged.
- Preserve query keys: Journal `['journal', ...]`, Notes `['note', ...]`,
  Notifications `['notifications']`/`['notifications-unread']`, Settings
  `['settings']`, `['assets', 'avatar']`, `['practice', 'settings']`,
  `['review', 'settings']`, and `['review', 'level-five']`.
- Preserve Journal request-version guards, debounce, explicit-create versus
  autosave distinction, and cache invalidation ordering.
- Preserve Notes save-on-blur/save-before-switch and asset cleanup semantics.
  Presentational components receive state/callbacks; they do not own queries.
- Keep authentication store updates, asset finalization/deletion, editor
  sanitization, ownership checks, and notification generation server-owned.

## CSS Coexistence And Removal

1. Keep Tailwind Preflight disabled under ADR 0046 during this milestone.
2. Do not add new feature CSS files.
3. Remove Journal/Notes legacy shell classes, duplicated navigation, and
   presentation-only inline styles after route proof.
4. Remove `DashboardPage.css` and `NotesPage.css` imports from Notes only after
   active-consumer scans and focused proof show the replacement is complete.
5. Delete selectors made unreachable by these four routes, but leave the
   initiative-wide global/route stylesheet deletion and final allowlist to
   `US-UI-005`.
6. Keep only genuinely computed inline values, such as the editor zoom custom
   property, and document each survivor for the final audit.

## Accessibility And Responsive Contract

- Editors retain semantic labels, keyboard toolbar access, visible focus, and
  non-color status feedback. Upload errors are announced without stealing
  editor focus.
- Dialogs provide a name, initial focus, Escape close, focus return, pending
  protection, and explicit destructive wording.
- Notification rows and settings controls are reachable and operable by
  keyboard; icon-only controls have accessible names.
- Desktop proof uses 1440x1000 and tablet proof uses 1024x900. Local overflow
  is accepted only for an editor/workspace region with visible access to all
  primary actions; AppShell itself must not horizontally scroll.
- Reduced motion removes nonessential transitions while autosave, upload, and
  inbox state changes remain functional.

## Rejected Alternatives

1. Replace the Journal/Notes editor during visual migration: rejected because
   it would combine storage/sanitization behavior with presentation risk.
2. Generic editor state in a shared primitive: rejected because autosave,
   navigation, and asset cleanup are feature contracts.
3. Flatten Settings into one route: rejected because current nested URLs and
   navigation are public behavior.
4. Optimistic notification reads by default: rejected until baseline behavior
   proves it preserves current failure semantics.
5. Implement deferred Notes management controls because APIs exist: rejected
   because the product contract explicitly excludes them.

## Expected File Areas

- `src/frontend/src/components/AppShell.tsx` only for reusable shell needs
- `src/frontend/src/components/ui/` for the minimum missing primitives
- `src/frontend/src/routes/journal/*`
- `src/frontend/src/routes/notes/*`
- `src/frontend/src/routes/notifications/*`
- `src/frontend/src/routes/settings/*`
- Focused unit tests and existing/new Chromium E2E scenarios
- Bounded CSS/import cleanup and E27 story evidence
