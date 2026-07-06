# Overview

## Current Behavior

After `US-BC-003`, repository ownership is split by bounded context, but the
EF model still maps learning tables into the default schema with legacy table
names:

- `flashcard_decks`
- `flashcard_cards`
- `practice_settings`
- `practice_session_summaries`
- `review_settings`
- `word_review_states`
- `word_review_histories`

`AppDbContextModelSnapshot` and existing migrations also show legacy/default
schema ownership, and migration history still contains `card_reviews` lineage.

## Target Behavior

Move learning persistence ownership into PostgreSQL schemas that match Feature
20 context boundaries:

- Flashcard: `flashcards.decks`, `flashcards.cards`
- Practice: `practice.settings`, `practice.session_summaries`
- Review: `review.settings`, `review.word_states`, `review.word_histories`

This story must also make the migration posture explicit:

- dev/local implementation may use a destructive reset path because the app is
  still pre-production
- any production or user-data rollout must preserve learning data and use an
  approved preserve-data path

## Affected Users

- Backend maintainers reviewing migration risk and schema ownership.
- Reviewers checking that Feature 20 can move forward without hidden data-loss
  assumptions.

## Affected Product Docs

- `SPEC.md` Section 20
- `docs/stories/epics/backend-bounded-context-split/US-BC-001-contract-and-ownership-map/contract-map.md`
- `docs/stories/epics/backend-bounded-context-split/epic-map.md`

## Non-Goals

- Public API route changes.
- Frontend API client changes.
- Vocabulary sync/cleanup ownership split.
- Separate databases or separate services.
- Release proof across all learning workflows.
