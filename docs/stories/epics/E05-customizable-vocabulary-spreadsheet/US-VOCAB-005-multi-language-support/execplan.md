# Exec Plan

## Goal

Complete SPEC.md US-011 for language-adaptive labels and board-language TTS.

## Scope

In scope:

- Shared frontend language profile helper.
- Vocabulary spreadsheet secondary-column labels.
- Flashcard viewer and review-answer labels.
- Best-effort TTS language and voice selection.
- Deck-list DTO language field.
- Unit and E2E proof.

Out of scope:

- Full UI localization.
- Dedicated Pinyin schema.
- External TTS provider integration.

## Risk Classification

Risk flags:

- Public contracts.
- Existing behavior.

Hard gates:

- None.

## Work Phases

1. Add language profile helper and frontend labels.
2. Extend deck list DTO with board language.
3. Add unit tests for labels and TTS voice matching.
4. Add focused E2E smoke for a Chinese board.
5. Verify backend, frontend, and Harness records.

## Stop Conditions

Pause for human confirmation if a dedicated language-specific data model becomes necessary.
