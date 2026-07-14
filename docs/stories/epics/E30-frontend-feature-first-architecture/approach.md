# E30 Frontend Feature-First Architecture Approach

## Recommended Path

Use an incremental strangler migration around the frontend route manifest.
`app/router.tsx` becomes the application composition point in the first story.
Routes that have not yet migrated are lazy-loaded through an explicit temporary
migration manifest. Each later story replaces only its feature's legacy entries
with the feature's exported `RouteObject[]`, updates all callers, moves its
tests, and deletes its superseded paths.

The temporary manifest is not a compatibility barrel: product code does not
import through it, migrated features are not re-exported from it, and its
remaining entries are visible migration debt. It shrinks after every feature
story and is deleted by final closeout.

## Slice Cutover Recipe

Every feature story follows the same bounded sequence:

1. Inventory the feature's routes, components, API functions, types, hooks,
   realtime subscriptions, tests, and cross-feature callers.
2. Move real files into `features/<feature>` and colocate ownership concerns;
   do not add empty target folders.
3. Export only supported cross-feature contracts from the feature `index.ts`.
4. Export lazy `RouteObject[]` from `<feature>.routes.tsx` and replace the
   feature's temporary route-manifest entries.
5. Update app composition and cross-feature consumers to use the feature's
   public API.
6. Move unit/component tests to `src/test/<feature>` and update semantic mocks.
7. Delete the superseded source paths and prove no old or deep-import reference
   remains.
8. Run focused tests, route proof, lint/type checking, and production build
   before the story closes.

## Why This Path

- A one-shot directory rewrite would mix router, import, auth, realtime, test,
  and product regressions across the whole SPA with no useful rollback point.
- Moving files without changing ownership would recreate the current coupling
  behind different folder names.
- A permanent compatibility layer would make both structures supported and
  prevent E30 from ever reaching a single canonical architecture.
- Enabling dependency rules before a migration seam exists would fail on every
  legacy import and make lint output unusable. Rules therefore tighten as
  ownership moves, then become blocking globally in final cleanup.
- Feature-by-feature route replacement gives each story an observable proof:
  the same route and behavior run from the new lazy feature boundary.

## Foundation Design

`US-FE-001` establishes the only temporary migration seam and proves it across
the full route manifest:

- `main.tsx` remains a browser bootstrap only.
- `app/query-client.ts` owns production QueryClient construction.
- `app/providers.tsx` composes Query, toast, shell-session/navigation, and
  other application providers.
- `app/router.tsx` creates the browser router and aggregates route objects.
- `app/App.tsx` renders `RouterProvider`.
- `features/auth` owns auth pages, API, Zustand state, and public route objects;
  `app/route-guards/ProtectedRoute.tsx` composes the Auth public API.
- `shared/lib/http/client.ts` owns Axios transport/interceptors.
- `shared/components/ui`, `layout`, and `feedback` own domain-neutral UI.
- The shared AppShell receives account/navigation behavior through a
  domain-neutral provider contract; `shared` does not import Auth or any other
  feature.
- Application-level protected realtime composition moves out of the auth
  guard. Until each realtime feature migrates, the app-level composition may
  call its existing hook through the explicit migration boundary.
- `src/test/render.tsx` creates isolated memory-router/query-provider test
  renders; production and test QueryClient instances are never shared.

## Integration Boundaries

- **Browser composition:** `main.tsx`, `app/App.tsx`, `app/router.tsx`, and
  `app/providers.tsx`.
- **Route contract:** all current public/protected paths, nested Settings paths,
  redirects, query parameters, and auth checks remain unchanged.
- **Shared dependency direction:** shared code may depend on third-party code
  and other shared code, never on app or a product feature.
- **Feature dependency direction:** feature code may depend on shared; app may
  compose feature public APIs; cross-feature calls use only public APIs.
- **Server state:** query keys, mutation ordering, invalidation, and endpoint
  payloads remain stable while adapters move.
- **Realtime:** shared connection construction is infrastructure; event names,
  subscriptions, and invalidation remain feature-owned.
- **Presentation:** keep the accepted E27 design-system behavior and canonical
  tokens; E30 does not redesign screens or bulk-convert styling.
- **Tests:** unit/component tests move with each ownership slice to
  `src/frontend/src/test`; Playwright remains under `src/frontend/e2e`.

## Risk And Required Proof

| Risk | Cause and effect | Required proof |
| --- | --- | --- |
| Router semantic drift | Converting JSX routes to data routes can alter nested Settings resolution, wildcard redirect, query preservation, or auth loading. | Unit route-manifest tests plus authenticated Chromium reachability for all current routes. |
| Lazy module mismatch | A route module can compile but fail at runtime if its lazy export shape is wrong. | Open every migrated route in a production build and assert no lazy-load/error-boundary failure. |
| Shared-to-feature cycle | AppShell currently reads Auth directly; moving it unchanged to shared would reverse the dependency rule. | Static dependency scan and focused AppShell/auth tests after provider inversion. |
| Realtime loss or duplication | ProtectedRoute currently starts Todo, Habit, Kanban, and Pomodoro hooks. Moving the guard can stop events or register them twice. | One connection/subscription lifecycle test per realtime feature plus focused E2E mutation/sync proof. |
| API ownership drift | `flashcard.api.ts` currently mixes Flashcards, Practice, and Review endpoints used by Settings. A mechanical move could preserve the wrong boundary or change query behavior. | Endpoint-family scan, public API imports, focused settings/session tests, and unchanged request contracts. |
| QueryClient duplication | Moving providers can create multiple caches or reuse the production singleton in tests. | Provider tests showing one production client boundary and isolated clients per test render. |
| Barrel cycles and bundle growth | Broad `index.ts` exports can pull route/UI code into unrelated chunks. | Public-export review, lazy chunk inspection, and production build output comparison. |
| Test mock breakage | Centralizing tests changes relative paths and module mock identities. | Moved focused tests pass before old tests/files are deleted; no duplicate test copies remain. |
| Styling regression | Moving the canonical stylesheet or CSS Modules can change import order and lazy chunk behavior. | Route screenshots/smoke at blocking viewports and source scan for duplicate global style entrypoints. |
| Hidden legacy paths | Old routes/components/API clients can remain referenced after a visually successful move. | Per-story old-path/deep-import static scan; final zero-legacy scan. |
| Dirty baseline attribution | Current lint/build fail on six unused Dashboard symbols while Vitest passes 40/40. | `US-FE-001` must restore a clean lint/build baseline without changing Dashboard behavior before migration evidence is accepted. |

## Story And Dependency Shape

The initiative uses one story per independently verifiable feature boundary.
Stories are grouped into the approved domain phases in `story-map.md`, but a
large domain is not migrated as one atomic commit. This keeps failures local
while retaining the approved domain ordering.

## Compatibility And Rollback

- Existing route URLs, API endpoints/payloads, query keys, user workflows, and
  realtime contracts remain stable.
- Unmigrated features may remain in the temporary route manifest. A migrated
  feature may not keep an old path or old export.
- Each story is rolled back by reverting only its route-object replacement,
  source moves, and import updates; no backend or data rollback is required.
- Stop if a slice requires backend/schema/domain change, an unapproved UX
  change, or a permanent exception to the dependency direction.
- Stop if the previous story is not buildable/testable; do not stack new
  feature moves on an unresolved migration regression.

## Rejected Alternatives

1. **One-shot full-tree rewrite:** rejected because regressions cannot be
   localized and the SPA would not remain demonstrably usable between steps.
2. **Permanent old-path re-exports:** rejected by D11 because they preserve two
   supported architectures and hide incomplete migration.
3. **Move pages first and leave APIs/hooks global:** rejected because it changes
   folders without establishing domain ownership.
4. **Move every reusable-looking file into shared:** rejected by D15 because it
   creates a new dumping ground and cross-domain coupling.
5. **Global Zustand per feature:** rejected by D16; server/session/local state
   keeps its appropriate owner.
6. **One global realtime hook:** rejected by D17 because domain event and cache
   behavior would become coupled again.
7. **Bulk CSS rewrite during architecture migration:** rejected by D10 because
   it combines unrelated visual and ownership risk.

## Documentation And Decisions

- Add an accepted architecture decision when `US-FE-001` proves the data-router,
  feature-public-API, and shared dependency direction.
- Update `docs/ARCHITECTURE.md` incrementally so it describes only boundaries
  that are already live and marks the migration seam while it exists.
- Preserve `docs/product/` behavior. Update product docs only to correct stale
  architectural wording, never to introduce E30 behavior changes.
- Record focused proof and Harness evidence at every story closeout.
- Remove the temporary migration documentation and reconcile final ownership in
  `US-FE-016`.
