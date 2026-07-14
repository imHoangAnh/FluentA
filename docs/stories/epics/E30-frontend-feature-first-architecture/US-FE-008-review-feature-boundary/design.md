# Design — US-FE-008

The router will compose `reviewRoutes` from `@/features/review`. The legacy
Review session page and `/review/*` adapter functions/types transfer to that
feature; `review-settings.api.ts` remains its settings owner. The mixed legacy
adapter then has no remaining owner and is removed. Dashboard imports the
Review public dashboard function rather than a deep path. Review continues to
read Flashcards board data only through `@/features/flashcards`.
