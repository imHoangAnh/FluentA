# US-FE-001 Execution Plan

## Preconditions

- E30 context and plan are approved.
- High-risk validation is complete and implementation is explicitly approved.
- Record the current route manifest and Auth/protected behavior before moving
  files.
- Restore a clean frontend lint/build baseline by removing or completing only
  the six behavior-neutral unused Dashboard symbols currently reported. Stop
  for user direction if they represent unfinished intended UI behavior.
- Preserve unrelated worktree changes.

## Implementation Sequence

1. **Capture contract baseline.** Add/strengthen route-manifest tests for every
   public/protected path, nested Settings behavior, wildcard redirect, auth
   loading/anonymous/authenticated states, and current query preservation.
2. **Create real shared foundations.** Move UI primitives, AppShell layout,
   Axios client, avatar/language/utils, canonical design-system stylesheet, and
   new loading/error feedback components to approved shared/style paths. Update
   consumers; do not create unused directories.
3. **Invert AppShell dependencies.** Introduce the neutral shell environment
   contract and app adapter so shared imports no feature while current account,
   logout, navigation, active-state, and collapse behavior remain unchanged.
4. **Migrate Auth end to end.** Move Auth API, store, components, pages, route
   objects, and tests into `features/auth`; move the guard to
   `app/route-guards/ProtectedRoute.tsx`, expose the smallest Auth public API,
   and delete their legacy paths.
5. **Separate protected runtime composition.** Move cross-domain realtime
   startup out of Auth into app composition, preserving one subscription
   lifecycle per authenticated application tree.
6. **Create application composition.** Add QueryClient, providers, data router,
   App component, route loading/error handling, and the explicit lazy migration
   manifest. Reduce `main.tsx` to browser bootstrap.
7. **Centralize current tests.** Keep setup under `src/test`, add
   `renderWithProviders`, and move App/Auth tests without duplicate copies.
8. **Add initial boundary enforcement.** Block shared-to-app/feature imports and
   Auth deep imports now. Add an explicit narrow allowlist only for unmigrated
   app manifest/runtime entries; record its expected shrink path.
9. **Update architecture records.** Add the feature-first/data-router decision
   and update `docs/ARCHITECTURE.md` to describe the live boundary and temporary
   migration manifest.
10. **Verify and close.** Run focused and full frontend proof, static scans,
    inspect lazy chunks/console, record Harness evidence, and confirm no Auth or
    shared source remains at superseded paths.

## Expected File Areas

- `src/frontend/src/main.tsx`
- `src/frontend/src/app/**`
- `src/frontend/src/features/auth/**`
- `src/frontend/src/shared/components/ui/**`
- `src/frontend/src/shared/components/layout/**`
- `src/frontend/src/shared/components/feedback/**`
- `src/frontend/src/shared/lib/http/client.ts`
- `src/frontend/src/shared/lib/{avatar,language,utils}.ts`
- `src/frontend/src/styles/design-system.css`
- `src/frontend/src/test/setup.ts`, `src/frontend/src/test/render.tsx`, and
  App/Auth test folders
- Imports in legacy API/page files needed to consume the new shared paths
- `src/frontend/eslint.config.js`
- `src/frontend/vite.config.ts` and TypeScript config only if required for the
  approved paths/tests; aliases remain `@/* -> src/*`
- `src/frontend/e2e/` focused route/Auth proof
- `docs/ARCHITECTURE.md`, a new architecture decision, E30 story evidence, and
  Harness records

## Verification Commands

Exact focused filenames may be refined by validation, but the blocking command
shape is:

```powershell
npm --prefix src/frontend run lint
npm --prefix src/frontend run test:run
npm --prefix src/frontend run build
npm --prefix src/frontend run test:e2e -- <focused-auth-and-route-manifest-specs>
rg -n "routes/auth|lib/auth/ProtectedRoute|stores/authStore|lib/api/auth.api|components/AppShell|components/ui|lib/api/client" src/frontend/src
```

The final scan may contain only documented references in the temporary
migration manifest for concerns not owned by Auth/shared; Auth and moved shared
paths must return zero active source imports.

## Rollback And Stop Conditions

- Revert only the US-FE-001 composition/file-move slice; no backend/data
  rollback exists.
- Stop if route semantics, token refresh behavior, or realtime subscription
  count cannot be preserved.
- Stop if AppShell cannot become shared without a feature dependency under the
  approved contract.
- Stop if a third-party router/lint change is required beyond current packages
  and cannot be validated within this story.
- Do not proceed to `US-FE-002` with failing lint, tests, build, blocking route
  proof, or unresolved P1/P2 regression.
