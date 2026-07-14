# US-FE-002 Design

## Recommended Shape

Use the standard E30 slice cutover with one page, one route module, one public
index, and focused tests. Keep the current Dashboard implementation intact
rather than extracting hooks/widgets during an ownership migration.

```text
app/router.tsx
  -> features/dashboard (public index)
       -> dashboard.routes.tsx
            -> lazy pages/DashboardPage.tsx
                 -> features/auth (public API)
                 -> shared AppShell/UI/utils
                 -> temporary legacy domain adapters
```

## File And Route Changes

| Current | Target / action |
| --- | --- |
| `src/routes/dashboard/DashboardPage.tsx` | Move to `src/features/dashboard/pages/DashboardPage.tsx`. |
| Dashboard index entry in `app/legacy-routes.tsx` | Delete. |
| Protected child composition in `app/router.tsx` | Prepend/compose `dashboardRoutes` with remaining legacy routes. |
| None | Add `features/dashboard/dashboard.routes.tsx` with one lazy index route. |
| None | Add `features/dashboard/index.ts` exporting only `dashboardRoutes`. |
| Dashboard-specific assertions in `src/test/app/App.test.tsx` | Move behavior-focused cases to `src/test/dashboard/DashboardPage.test.tsx`; retain app composition/navigation cases in App tests. |
| Legacy-manifest expected paths test | Remove only the Dashboard `<index>` entry from expected migration debt. |
| Dashboard Playwright assertions using old title | Align to the accepted `Overview` title without changing product UI. |

Do not create `api`, `components`, `hooks`, `store`, or `types` folders because
Dashboard has no owned implementation for them in this slice.

## Temporary Cross-Domain Dependencies

Dashboard is an aggregation UI. Its source temporarily imports unmigrated
domain adapters until their owning E30 stories expose public APIs:

| Current dependency | Preserved behavior | Replacement owner |
| --- | --- | --- |
| `lib/api/flashcard.api.ts#getDashboard` | `['review', 'dashboard']`, `/review/dashboard`, timezone | `US-FE-008` Review |
| `lib/api/todo.api.ts` | Today's list, toggle, `['todo']` invalidation | `US-FE-009` Todo |
| `lib/api/countdown.api.ts` | Countdown list and nearest-event selection | `US-FE-014` Countdown |
| `lib/api/habit.api.ts` and `lib/habit-icons.tsx` | Scheduled-today list, toggle, glyph | `US-FE-015` Habits |
| `routes/journal/JournalRichTextEditor.tsx` | Idle post-mount preload | `US-FE-011` Journal |

These are explicit migration dependencies, not new Dashboard ownership. Each
owning story must replace its Dashboard imports through that feature's public
API. US-FE-002 must not copy these adapters or add compatibility re-exports.

## Implementation Sequence

1. Strengthen Dashboard-focused component coverage against the current page
   before moving it: loading, empty, populated, quick-toggle, and links.
2. Move the page and update only path-sensitive imports, including the Journal
   preload path.
3. Add the lazy index `dashboardRoutes` and minimal public index.
4. Compose Dashboard routes in `app/router.tsx` and remove the legacy index
   entry plus its expected-manifest assertion.
5. Move Dashboard-specific tests to `src/test/dashboard`; keep protected
   routing/AppShell composition tests under `src/test/app`.
6. Align stale Dashboard title selectors to `Overview` in relevant focused E2E
   specs; do not restore removed widget-settings UI.
7. Run focused tests and scans, then full lint/Vitest/build and Chromium route
   plus Dashboard behavior proof.
8. Update story evidence and Harness; do not change `docs/ARCHITECTURE.md`
   because its current feature-first description already covers this slice.

## Risk And Required Proof

| Risk | Cause and effect | Required proof |
| --- | --- | --- |
| Protected index conflict | Leaving both feature and legacy index routes can create ambiguous `/` matching. | Route-object test proves one protected index; legacy manifest contains no `<index>`. |
| Lazy export mismatch | A wrong page export compiles in isolation but fails after navigation. | Memory-router test plus production Chromium direct `/` load and build chunk inspection. |
| Query/mutation drift | Refactoring the page while moving it could change keys, timezone/date input, toggle calls, or invalidation. | Focused component tests with mocked adapters and existing API-backed Dashboard E2E. |
| Premature domain ownership | Copying Todo/Habit/Countdown/Review APIs into Dashboard would create duplicate clients. | File/import review proves adapters remain single-owner legacy dependencies until their stories. |
| Test ownership ambiguity | Keeping all behavior tests in App tests hides the Dashboard boundary. | Dashboard behavior tests live under `src/test/dashboard`; App tests retain only app composition concerns. |
| Stale selectors | Old `Dashboard Overview` locators fail before proving the moved page. | Update only test locators to the already-shipped `Overview` title and run desktop/tablet proof. |
| Hidden legacy source | The route works while old Dashboard source remains. | `Test-Path`/`rg` scan proves no `src/routes/dashboard` file or legacy manifest entry. |

## Rejected Alternatives

1. Migrate all four data domains with Dashboard: rejected because it breaks the
   approved E30 dependency order and makes rollback cross-domain.
2. Create a Dashboard API adapter that re-exports Todo/Habit/Countdown/Review:
   rejected because Dashboard owns composition, not those endpoints.
3. Extract `useDashboardOverview` and widget components during the move:
   rejected because current reuse does not justify it and it expands behavior
   risk without an acceptance benefit.
4. Keep an old Dashboard re-export under `routes/dashboard`: rejected by D11;
   the feature route is the only supported owner after cutover.
5. Change the title back to `Dashboard Overview` to satisfy stale tests:
   rejected because the accepted current UI is `Overview`; tests must follow
   shipped behavior.

## Rollback And Stop Conditions

- Roll back this slice by reverting the Dashboard route composition, source
  move, and test-path changes together; no backend/data rollback exists.
- Stop if `/` cannot remain a single protected lazy index route.
- Stop if implementation requires changing an API, query key, user-visible
  behavior, or another feature's ownership.
- Stop if focused Dashboard proof or full frontend lint/test/build exposes a
  regression that cannot be attributed and fixed within this slice.
