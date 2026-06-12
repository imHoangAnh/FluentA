# Exec Plan

## Goal

Deliver safe rich-text Journal editing with visible two-second autosave.

## Scope

In scope:

- Backend HTML sanitization and plain-text derivation.
- `plain_text_content` migration and backfill.
- Tiptap editor and formatting toolbar.
- Existing-entry autosave status and retry behavior.
- Focused backend, frontend, and browser proof.

Out of scope:

- Search, calendar, and auto-created drafts.

## Risk Classification

Risk flags:

- Data model.
- Public contracts.
- Existing behavior.
- Audit/security.

Hard gates:

- Data migration.
- Sanitization/security boundary.

## Work Phases

1. Lock the rich-text and autosave contracts.
2. Add backend content processing and migration.
3. Add Tiptap editor and autosave behavior.
4. Add focused tests.
5. Verify migration, builds, tests, and browser flow.
6. Update Harness evidence and trace.

## Stop Conditions

Pause for human confirmation if:

- Existing plain content cannot be migrated without loss.
- Sanitization requires weakening the supported formatting contract.
- Validation requirements need to be weakened.

