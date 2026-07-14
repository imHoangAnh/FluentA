# Design — US-FE-007

## Cutover

`app/router.tsx` will compose `practiceRoutes` from `@/features/practice`.
The feature will own its library, launch dialog, session page, settings/session
adapter/types, and route object. The legacy manifest will no longer contain
either Practice URL.

The existing mixed legacy `flashcard.api.ts` will transfer only its
`/practice/*` functions and types into the existing Practice adapter. Review
functions remain there until US-FE-008; this is endpoint ownership, not a
compatibility re-export.

## Integration boundary

Practice reads Flashcard deck lists and page-session cards from the public
`@/features/flashcards` contract. Flashcards retains those endpoint adapters,
the `flashcard` React Query keys, and realtime ownership. Settings continues
to use the public Practice settings contract.

## Required proof

Prove lazy URL reachability, `deck` modal and `order=shuffle` navigation,
session completion versus add-to-review behavior, and responsive deck selection.
Scan for old Practice paths and cross-feature deep imports after migration.
