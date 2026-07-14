# Design — US-FE-006

## Cutover

`app/router.tsx` composes `flashcardRoutes` from `@/features/flashcards`.
The feature owns the library/viewer pages, deck-library UI, Flashcards API
subset and types, and the FlashcardDeckUpdated hook. The public index exposes
the route object plus the small Flashcards contract needed by the still-legacy
Practice library/session code.

The existing mixed `flashcard.api.ts` is split by endpoint domain: Flashcards
endpoints move now; Practice and Review endpoint functions stay only as a
temporary legacy owner until their designated stories. Their consumers import
Flashcards data through the feature public API rather than a deep import or a
compatibility barrel.

## Compatibility boundary

The current `/practice` library is extracted from the old shared Flashcards
page into its own temporary legacy route component. It uses the Flashcards
public contract and retains the same query parameter/modal navigation. This is
not a second Flashcards implementation and is removed in US-FE-007.

## Required proof

Prove library/viewer URL reachability, deck/session request behavior, realtime
query invalidation, and the Practice consumer flow. Scan for old Flashcards
paths and cross-feature deep imports after migration.
