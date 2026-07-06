# Exec Plan

## Goal

Move learning tables to `flashcards`, `practice`, and `review` PostgreSQL
schemas with explicit migration posture and proof.

## Scope

In scope:

- Update EF configurations to target the new schemas.
- Update model snapshot and create the required migration path.
- Verify indexes, FKs, filters, and table ownership after the move.
- Resolve the `card_reviews` legacy status for this story.
- Document dev/local destructive-reset posture and production preserve-data
  requirement.
- Run backend proof plus migration/model review.

Out of scope:

- Controller or route changes.
- Frontend endpoint/client changes.
- Vocabulary sync/cleanup ownership changes.
- Full release proof.

## Risk Classification

Risk flags:

- Data ownership and migration risk.
- Schema/table/index/FK drift.
- Legacy `card_reviews` ambiguity.
- Potential local reset versus future preserve-data divergence.

Lane: high-risk.

## Work Phases

1. Inventory current EF table mappings, snapshot state, and migration lineage.
2. Resolve `card_reviews` active-versus-legacy status.
3. Update entity configuration schema mappings.
4. Generate or refresh the migration and model snapshot.
5. Review migration SQL/model output for table moves, indexes, FKs, and
   filters.
6. Run targeted backend tests/build and EF migration proof.
7. Update story evidence and trace.

## Stop Conditions

Pause for human confirmation if:

- the schema move requires controller/frontend changes to remain usable
- `card_reviews` resolution implies a product behavior change
- the migration path would silently drop required user data outside the agreed
  dev/local reset posture
- Vocabulary or non-learning tables would need to move as part of this story
