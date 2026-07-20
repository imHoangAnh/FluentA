# Overview

## Current Behavior

Practice and Review pronunciation use browser transcript equality, answer
feedback exposes detailed explanatory text, recaps use legacy card layouts,
Practice decks show five square cards per desktop row, and review state stores
timezone-derived UTC timestamps.

## Target Behavior

Both workflows assess short owned-word WAV audio through a backend-only Azure
Speech adapter and apply the approved 70-point threshold and attempt rules.
Feedback shows only Correct/Wrong, both recaps use the approved centered field
order, Practice displays ten compact decks per wide row, and review-state due
and last-reviewed values are true database dates.

## Affected Users

- Authenticated learners using Practice or Review.
- Operators configuring an Azure Speech resource.

## Affected Product Docs

- `docs/product/learning-workflows.md`
- `docs/product/flashcards.md`

## Non-Goals

- Prosody, transcript, numeric score, phoneme coaching, or saved recordings.
- SRS interval or daily queue redesign.
- Flashcard viewer/library redesign.
- Removing active review-history or flashcard-card tables.

