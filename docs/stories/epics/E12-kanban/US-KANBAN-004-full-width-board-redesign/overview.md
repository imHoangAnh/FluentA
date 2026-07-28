# US-KANBAN-004 Full-width Kanban board redesign

## Status

implemented

## Lane

normal

## Product Contract

Redesign the existing `/kanban` workspace around the approved wide project-board
reference while preserving every current API and interaction contract. The page
must use almost all width supplied by AppShell, give the columns the dominant
area, and keep any required horizontal overflow inside the board region.

## Relevant Product Docs

- `docs/product/kanban.md`
- `docs/ARCHITECTURE.md`
- `docs/stories/epics/E12-kanban/US-KANBAN-003-project-workspace-detail-panel.md`

## Acceptance Criteria

1. `/kanban` opts out of AppShell's `1480px` content cap and uses compact route
   gutters without changing AppShell behavior for another route.
2. The visible hierarchy is project navigation, selected board identity and
   supported primary action, client-side filters, then the board columns.
3. Only existing supported actions remain: project selection/creation,
   Priority and Deadline filters, Add column, column rename/delete, card CRUD,
   drag/drop, and explicit Move.
4. Unsupported reference controls are not introduced: no card search,
   assignee, star, info, clear-filters action, or placeholder overflow menus.
5. Three columns expand to fill the available desktop board width. Additional
   columns produce local board overflow without document-level horizontal
   overflow.
6. Each column has a clear icon/title/count header, an early Add Card action,
   readable cards, and a useful empty state while preserving drag/drop targets.
7. The existing non-modal card detail panel remains reachable and usable at
   desktop, tablet, and narrow widths.
8. Focus states, accessible names, loading/error states, and existing mutation
   behavior remain intact.

## Recommended Path

- Set a Kanban-specific AppShell content class through route metadata.
- Recompose `KanbanPage` presentation only; keep React Query state, mutations,
  API adapters, and data types unchanged.
- Restyle only Kanban selectors in `design-system.css`, using FluentA semantic
  tokens and Lucide icons.
- Keep a flexible three-column composition that stretches on desktop and owns
  horizontal overflow when four or more columns exist.

## Rejected Alternatives

- Add every control visible in the reference: rejected because Search,
  Assignee, Star, Info, and generic menus lack a current contract.
- Change the shared AppShell max width globally: rejected because unrelated
  routes must not change.
- Replace API-backed movement or editing patterns: rejected because this is a
  presentation refinement, not a Kanban behavior rewrite.
- Add decorative image assets for empty columns: rejected because the existing
  Lucide visual language can provide a lighter, theme-aware empty state.

## Expected Files

- `src/frontend/src/features/kanban/kanban.routes.tsx`
- `src/frontend/src/features/kanban/pages/KanbanPage.tsx`
- `src/frontend/src/features/kanban/pages/KanbanPage.test.tsx`
- `src/frontend/src/styles/design-system.css` (Kanban selectors only)
- `src/frontend/e2e/kanban-workspace-redesign.spec.js`
- `docs/product/kanban.md`
- `docs/stories/epics/E12-kanban/US-KANBAN-004-full-width-board-redesign/validation.md`

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit / component | Supported hierarchy and controls render; unsupported reference controls do not; panel/card behavior remains intact. |
| Integration boundary | Source and diff scan show no new endpoint, DTO, schema, backend, or SignalR change. |
| E2E | Mocked API desktop/tablet proof for wide workspace, three-column fill, local column overflow, and no document overflow. |
| Platform | Focused lint, production build, and Chromium layout screenshots. |
| Release | Focused Kanban tests plus known full-suite status, `git diff --check`, Harness story verification, and trace. |

## Dependency Order

1. Lock presentation contract and deterministic browser fixtures.
2. Recompose route/page markup without changing mutations.
3. Apply scoped responsive styles.
4. Run focused tests/build/browser proof and reconcile documentation.

## Stop Conditions

- Stop if the design requires a new endpoint, backend field, migration, or
  change to ownership/deletion semantics.
- Stop if route-local width cannot be achieved without changing AppShell for
  unrelated pages.
- Stop if the change would overwrite current E35 Trash lifecycle work in the
  Kanban page; preserve and test those mutations instead.

## Harness Delta

- Register this approved change request as `US-KANBAN-004`.
- No architecture decision is required because all API, schema, ownership,
  deletion, and realtime boundaries remain unchanged.
