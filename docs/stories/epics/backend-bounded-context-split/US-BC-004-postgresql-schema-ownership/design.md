# Design

## Schema Mapping

This story owns the EF/table move from legacy default-schema table names to
context-owned PostgreSQL schemas.

Target mapping:

| Entity / current table | Target table |
| --- | --- |
| `FlashcardDeck` / `flashcard_decks` | `flashcards.decks` |
| `FlashcardCard` / `flashcard_cards` | `flashcards.cards` |
| `PracticeSettings` / `practice_settings` | `practice.settings` |
| `PracticeSessionSummary` / `practice_session_summaries` | `practice.session_summaries` |
| `ReviewSettings` / `review_settings` | `review.settings` |
| `WordReviewState` / `word_review_states` | `review.word_states` |
| `WordReviewHistory` / `word_review_histories` | `review.word_histories` |

Indexes, unique constraints, filters, and foreign keys must remain equivalent
after the move.

## Migration Posture

Feature 20 already chose the posture:

- local/dev implementation may use a destructive reset migration path
- production or real user-data rollout must not rely on destructive reset

Because the current repo is still pre-production, this story may implement the
dev/local path first if that is the smallest clean move. The story must still
document the production preserve-data requirement and identify where a future
preserve-data migration/script would be required before release.

## Legacy `card_reviews`

`card_reviews` remains present in migration history and legacy review lineage.
This story must explicitly resolve it during validation:

1. keep it under Review schema if active behavior still depends on it, or
2. document and remove it as legacy migration residue if it is no longer part
   of the shipped learning model

The implementation should prefer the smallest path consistent with the current
runtime model and Feature 20 ownership.

## EF Ownership

The story may update:

- entity configuration `ToTable` schema arguments
- model snapshot
- migrations under `src/backend/FluentA.Infrastructure/Persistence/Migrations`

It should not change repository/service/API contracts except when required to
compile against the EF move.

## Alternatives Considered

1. Leave all learning tables in the default schema and only document ownership.
   Rejected because Feature 20 explicitly requires schema ownership to match
   bounded contexts.
2. Combine schema move with controller/frontend cutover.
   Rejected because schema risk should be isolated before public endpoint
   changes.
3. Require a production-grade preserve-data migration right now.
   Rejected for current dev-phase execution, but the release gate still demands
   an approved preserve-data path before production.
