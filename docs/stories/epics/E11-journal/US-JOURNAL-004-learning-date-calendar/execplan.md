# Exec Plan

## Goal

Deliver learning-date month browsing and date-based open/start behavior.

## Scope

In scope:

- Calendar API with owner/deleted filtering.
- Month validation.
- Journal month grid with entry indicators.
- Click populated date opens newest matching entry.
- Click empty date prepares a new unsaved entry for that date.
- Focused backend and browser proof.

Out of scope:

- Auto-created drafts, date modals, and recurring calendar integrations.

## Risk Classification

Risk flags:

- Authorization.
- Public contracts.
- Existing behavior.

Hard gates:

- Authorization.

## Work Phases

1. Record calendar contract and decision.
2. Implement repository/service/controller calendar endpoint.
3. Add calendar UI and date-click behavior.
4. Add tests and focused browser proof.
5. Update Harness evidence and trace.

## Stop Conditions

Pause for human confirmation if:

- Calendar behavior requires automatic record creation.
- Month lookup needs a new data model.
- Validation requirements need to be weakened.

