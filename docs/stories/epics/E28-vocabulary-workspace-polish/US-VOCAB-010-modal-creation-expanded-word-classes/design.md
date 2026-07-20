# US-VOCAB-010 Design

## Recommended Path

1. Reuse the repository-owned Radix Dialog wrapper for separate create-Board
   and create-Page form components. Keep the existing React Query mutations and
   API payloads in `WorkspacePage`.
2. Render the active Board's `Add page` trigger before the mapped Page controls.
   Continue sorting Pages newest-first independently of the trigger.
3. Add six domain enum members. Keep EF's existing string conversion and the
   API's lowercase serialization, then expose typed value/label options to both
   Vocabulary class selectors.
4. Prove the change at the UI interaction and application-service boundaries.

## Rejected Alternatives

- Keeping hidden inline forms styled as overlays would retain two competing
  interaction models and would not inherit Dialog focus/Escape behavior.
- Using display strings with spaces as API values would fail the current
  `Enum.TryParse` contract and would diverge from existing lowercase responses.
- Adding a migration is unnecessary because Word classes are string-converted
  and every new enum name fits the existing 20-character column.

## Integration Boundaries

- Frontend: `WorkspacePage`, a focused creation-dialog component,
  `vocabulary.api.ts`, `VocabTable`, and Vocabulary component tests.
- Backend: `WordClass` and focused `VocabularyServiceTests`.
- Product/Harness: Vocabulary product contract and this E28 story packet.

## Risks And Required Proof

| Risk | Required proof |
| --- | --- |
| A modal closes or mutates on Cancel/Escape | Component test proves no create call and dialog dismissal. |
| `Add page` moves below Pages after refetch | DOM-order test with multiple Pages. |
| Multi-word classes serialize to an unsupported value | Application theory test proves request parsing and lowercase DTO output for all six values. |
| Select labels become unreadable concatenated strings | Component test checks visible labels and stable lowercase option values. |
