# Overview

## Current Behavior

Review uses `word_review_states` and `word_review_histories`, but it does not
have a durable session model. Starting review builds an in-memory queue from
due words, applies overflow deferral immediately, and returns a generated
`sessionId` that is only reused as a grouping key on history rows. There is no
stored `active` session, no persisted queue membership, no same-day resume
state, and no explicit replaced/completed lifecycle.

## Target Behavior

Review gains durable source-of-truth ownership through three Review-owned
records:

- `review_state`
- `review_sessions`
- `review_session_items`

The backend becomes able to create one active same-day board session, persist
its queue membership, resume or replace it later, and track which words remain
unreviewed without depending on flashcard deck/card joins or history-only
session reconstruction.

## Affected Users

- Authenticated learner using Review.

## Affected Product Docs

- `docs/product/learning-workflows.md`
- `docs/product/flashcards.md`
- `docs/product/README.md`

## Non-Goals

- Final Review modal UX and Level 5 management UI.
- Practice recap redesign.
- Removal of `word_review_histories` in this slice unless replacement proof
  makes them fully obsolete.
