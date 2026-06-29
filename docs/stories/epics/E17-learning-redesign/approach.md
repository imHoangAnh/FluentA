# Approach: Learning Redesign

## Recommended Work Shape

Mode: `high_risk_feature`

Why smaller modes are insufficient:

- The redesign changes navigation, product language, data ownership,
  destructive migration behavior, and validation expectations together.
- The current repo still depends on All Words decks in frontend, backend, and
  dashboard flows.
- The feature is better expressed as capability and risk areas than as one
  direct patch or a narrow spike.

Use an epic map, then validate one foundational story before execution beads.

## Recommended Sequence

1. Remove the All Words deck model from sync and reads.
2. Introduce dedicated review-state ownership and destructive migration.
3. Split learning navigation and route responsibilities.
4. Rebuild Flashcard as a read-only viewer.
5. Rework Practice to batch-create/reset review state on full completion.
6. Rebuild Review as a board-scoped due-word workflow.
7. Run release regression across sync, speech interactions, dashboard, and
   queue behavior.

## Rejected Alternatives

1. Keep the old All Words deck model and layer Feature 14 UI on top.
   Rejected because it preserves the wrong ownership boundary and leaves
   dashboard, review, and sync logic coupled to the superseded model.
2. Split navigation first and defer migration later.
   Rejected because the new menus would still route into the old semantics and
   make later proof noisier.

## Risk Map

| Component | Risk | Reason | Proof Needed |
| --- | --- | --- | --- |
| Deck model migration | HIGH | Removing All Words changes sync, reads, and dashboard assumptions | migration + repository + UI regression proof |
| Review-state ownership | HIGH | SRS moves off flashcard cards into dedicated word-linked storage | data model + ownership + deletion proof |
| Practice persistence | HIGH | Feature 13 semantics change from summary-only to batch review-state reset/create | unit + E2E + abandoned-session proof |
| Review queue overflow | HIGH | Session start mutates due dates before answer submission | integration proof with deterministic fixtures |
| Navigation split | MEDIUM | Top-level routes and labels change across the protected app | focused browser proof |
| Dashboard fallout | MEDIUM | Current dashboard and CTA logic still assume All Words review | design decision + release regression proof |

## Likely File Boundaries

- Frontend app shell and routes: `src/frontend/src/App.tsx`,
  `src/frontend/src/routes/flashcards/*`,
  `src/frontend/src/routes/dashboard/DashboardPage.tsx`,
  `src/frontend/src/routes/settings/*`
- Frontend API client and shared learning helpers:
  `src/frontend/src/lib/api/flashcard.api.ts`
- Backend flashcard/review application and persistence:
  `src/backend/FluentA.Application/BoundedContexts/Flashcards/*`,
  `src/backend/FluentA.Infrastructure/Flashcards/*`,
  `src/backend/FluentA.Domain/BoundedContexts/Flashcards/*`,
  `src/backend/FluentA.Domain/BoundedContexts/Vocabulary/*`
- Migration and EF configuration:
  `src/backend/FluentA.Infrastructure/Persistence/*`
- Product and story docs under `docs/product/` and `docs/stories/`

## Validating Questions

- Should review-state rows denormalize `boardId` for queue performance or join
  through `VocabWord -> Page -> Board`?
- Does the dashboard stay in scope for the redesign, move under Review, or
  intentionally lose learning metrics in MVP?
- Can the old `ReviewSettings` table be migrated in place, or is a new review
  settings surface cleaner for the approved contract?
