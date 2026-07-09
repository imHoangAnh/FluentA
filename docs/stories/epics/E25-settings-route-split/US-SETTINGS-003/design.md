# Design

## Domain Model

- No backend or persistence change is required in this story.
- Existing Practice and Review settings API contracts remain unchanged.

## Application Flow

- `SettingsPracticePage.tsx` keeps a draft seeded from the Practice settings
  query and updates that draft locally for toggle and reorder actions.
- `SettingsReviewPage.tsx` keeps a draft seeded from the Review settings query
  and updates that draft locally for number input and recap toggle changes.
- Each page owns its own explicit save button and mutation state.
- Successful saves refresh both the route-local query cache and the aggregate
  settings cache payload.

## Interface Contract

- No Settings route autosaves edits in this story.
- Practice still enforces at least one active mode in the sequence.
- Review still edits only `dailyLimit` and `recapAfterAnswer`.
- Profile explicit-save behavior remains unchanged and continues to define the
  save contract for avatar uploads.

## Data Model

- No migration is required.
- No DTO or endpoint contract changes are required.

## UI / Platform Impact

- Practice and Review status copy changes from autosave language to explicit
  save language.
- Each route surfaces pending, success, and error feedback around its save
  button.
- Unsaved draft state remains on-screen after failed saves.

## Observability

- No new logging or metrics are required.
- Focused frontend tests provide the main regression proof.

## Alternatives Considered

1. Keep autosave and only rename UI copy.
   Rejected because locked decision D3 requires explicit save behavior.
2. Fold Practice and Review back into one combined page to reuse earlier save
   logic.
   Rejected because `US-SETTINGS-002` already established second-level route
   ownership.
