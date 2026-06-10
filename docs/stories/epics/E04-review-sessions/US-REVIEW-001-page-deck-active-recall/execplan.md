# Exec Plan

## Goal

Deliver the first complete interactive Page Deck study loop.

## Scope

In scope:

- Owner-scoped Page Deck session query.
- Page Deck review-record command with schedule preservation.
- Protected review route and deck entry action.
- Normal/Shuffle, reveal, TTS, ratings, keyboard controls, progress, summary.
- Unit, API/Postgres, and browser proof.

Out of scope:

- All Words review, SM-2, due queue, limits, settings, dashboard.

## Risk Classification

Risk flags:

- Authorization.
- Durable review records.
- Existing scheduling state.
- User-visible keyboard workflow.

Hard gates:

- Ownership.
- Schedule preservation.

## Work Phases

1. Add owner-scoped Page Deck query and rating command.
2. Add session route and interaction state.
3. Add TTS, keyboard controls, and immediate summary.
4. Prove durable review and unchanged scheduling.
5. Update product and Harness evidence.

## Stop Conditions

Pause if Page Deck rating cannot be recorded without scheduling mutation or if
the implementation requires durable session persistence.
