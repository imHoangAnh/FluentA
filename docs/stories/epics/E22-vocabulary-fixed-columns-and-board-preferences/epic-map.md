# Epic Map: Vocabulary Fixed Columns And Board Preferences

Mode: `high_risk_feature`

## Feature Outcome

FluentA replaces the customizable vocabulary spreadsheet contract with a fixed
word shape plus per-user, per-board table preferences for hidden nullable
columns, column order, and column widths. Vocabulary remains the source of
truth for page word content, Flashcard keeps synchronized read content, and
Review remains the sole SRS owner.

## Architecture / Reality Basis

- Current `VocabWord` still stores `meaningEn`, `thesaurus`, and
  `collocation`, while the frontend and API still expose board custom columns
  and custom values.
- Current board-level column preferences live in `vocab_column_visibility`
  while drag order is only persisted locally in browser storage.
- Current flashcard sync copies `MeaningEn`, `Thesaurus`, and `Collocation`
  from vocabulary words into read-only page-deck cards.
- Review ownership was already split out in Feature 20, so Feature 21 must not
  reintroduce SRS state into Vocabulary while changing the word content shape.

## Epics

| Epic | Capability / Risk Area | Why It Exists | Stories | Proof Needed |
| --- | --- | --- | --- | --- |
| E22-A | Backend contract and ownership cutover | Replace the durable word shape and remove custom-column APIs without breaking page-deck sync or Review ownership | US-VOCAB-006 | EF migration, CRUD, owner scope, slash-preservation, sync proof |
| E22-B | Frontend vocabulary workspace reset | Remove custom-column UI and persist fixed-column hide/order/width preferences board-wide | US-VOCAB-007 | component, build, interaction, overflow, board-wide reuse proof |
| E22-C | Release reconciliation | Prove migration, API/UI cleanup, and cross-feature fallout are closed | US-VOCAB-008 | end-to-end regression, static cleanup, matrix evidence |

## Story Queue

| Story | Epic | Outcome | Depends On | Feasibility Status |
| --- | --- | --- | --- | --- |
| US-VOCAB-006 | E22-A | `vocab_words` and board APIs use the fixed Feature 21 contract and new board-preference persistence | none | Ready to implement |
| US-VOCAB-007 | E22-B | Workspace table/settings use only fixed columns and board-wide backend preferences | US-VOCAB-006 | Ready after backend contract lands |
| US-VOCAB-008 | E22-C | Release proof covers migration, autosave, sync, removed custom paths, and horizontal overflow | US-VOCAB-006, US-VOCAB-007 | Ready after both slices land |

## Current Story To Prepare

`US-VOCAB-006` - Replace the vocabulary word contract and board preferences
backend.

Why now:

- It removes the legacy API/data-model paths that block every later Feature 21
  behavior.
- It decides the migration mapping for existing `meaning_en`, `thesaurus`, and
  `collocation` data before frontend work depends on the new shape.
- It lets the frontend story build against the real backend contract instead of
  temporary compatibility logic.
