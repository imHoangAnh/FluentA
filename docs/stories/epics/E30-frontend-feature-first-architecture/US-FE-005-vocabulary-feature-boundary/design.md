# Design — US-FE-005

## Ownership and dependency direction

`app/router.tsx` imports only `vocabularyRoutes` from `@/features/vocabulary`.
The feature route lazy-loads its page. The page owns its local components and
adapter; components use local Vocabulary API imports. Shared AppShell, UI,
language, utility, toast, and HTTP primitives remain under their neutral
shared owners.

## Migration

1. Move the Workspace page, Vocabulary UI components, API/types, and focused
   tests into `features/vocabulary` and `test/vocabulary`.
2. Add the feature public API and lazy route object; remove the legacy
   Vocabulary manifest entry.
3. Retain the exact React Query keys (`vocab`, `boards`, and `words`), adapter
   endpoints, and mutation behavior.
4. Update stale E2E selectors to prove the existing compact UI: explicit page
   creation, fixed optional column visibility, the final keyboard column, and
   AlertDialog/context-menu deletion.

## Rejected alternatives

- No compatibility barrel remains at `lib/api/vocabulary.api.ts`.
- No legacy route alias remains in the app manifest.
- No product UI is restored merely to satisfy obsolete browser selectors.
