# 0042 Vocabulary Fixed Word Contract And Board Preferences

Date: 2026-07-06

## Status

Accepted

## Context

Feature 21 replaces the E05 customizable vocabulary spreadsheet. The current
repo still stores custom-column definitions, custom values, browser-local
column order, and legacy word fields that no longer match the approved
product contract. The redesign must change schema, API shape, and workspace
behavior without breaking Flashcard synchronization or reintroducing SRS state
into Vocabulary.

## Decision

FluentA will:

- replace the vocabulary word contract with fixed fields
  `word`, `meaning_vn`, `ipa_pronunciation`, `definition`, `word_class`,
  `example`, `note`, `synonyms`, and `antonyms`
- remove custom-column definitions, custom values, and column-visibility
  persistence from the vocabulary backend and frontend
- add one per-user, per-board `vocab_board_preferences` row to store hidden
  nullable columns, column order, and column widths
- keep Review as the only SRS owner and keep Flashcard as a synchronized
  read-model consumer of vocabulary word content

## Alternatives Considered

1. Keep compatibility endpoints and old custom-column persistence during the
   cutover.
   Rejected because the approved Feature 21 behavior removes the custom-column
   model rather than versioning it.
2. Keep browser-local column order as the source of truth.
   Rejected because Feature 21 requires board-wide backend persistence reused
   across pages.

## Consequences

Positive:

- The durable model matches the approved product contract.
- Table preferences become portable across pages and sessions.
- Review ownership remains clean after Feature 20.

Tradeoffs:

- The cutover requires a migration decision for existing `meaning_en`,
  `thesaurus`, and `collocation` data.
- Flashcard synchronized read content may need aligned field mapping during the
  transition.

## Follow-Up

- Generate the EF migration and review the final mapping for legacy word data.
- Update the vocabulary workspace and release proof stories against this
  decision.
