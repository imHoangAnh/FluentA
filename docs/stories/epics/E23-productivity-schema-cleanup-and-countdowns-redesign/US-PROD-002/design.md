# Design

## Domain Model

- Countdown owns `name`, `target_date`, completion/retirement behavior, one
  optional linked finalized cover asset, and one-to-many alert rows.
- Alert rows store `alert_day`, local `alert_time`, and computed
  `scheduled_at_utc`.
- Countdown completion is driven by `target_date` in fixed
  `Asia/Ho_Chi_Minh` business rules, not by a user timezone setting.

## Application Flow

- Create validates name, future `target_date`, at least one and at most five
  alerts, duplicate alert rejection, and rejection of any alert already in the
  past at submit time.
- Create optionally finalizes and links one owned cover asset that already
  passed shared-asset upload validation.
- List returns active/upcoming countdowns first by nearest `target_date`,
  followed by completed countdowns that remain inside the seven-day visible
  window.
- Delete soft-deletes the countdown, cancels future unfired alerts, and retires
  any linked cover asset while leaving already-created inbox notifications
  intact.
- Cleanup auto-retires completed countdowns and linked cover assets seven days
  after `target_date`.

## Interface Contract

- Frontend route is `/countdowns`; legacy `/countdown` is removed.
- API remains under `/api/v1/countdowns` but removes patch/update behavior.
- Create accepts `name`, `targetDate`, `alerts`, and optional linked finalized
  cover asset id.
- Errors include not-found, validation failures, duplicate alert rejection, and
  invalid/missing owned asset linkage.

## Data Model

- Rename `countdown_events` to `countdowns` when the synchronized cutover is
  safe.
- Replace single alert marker fields with explicit countdown-alert persistence.
- Persist one optional foreign key to shared `assets` for the cover.
- Retain soft-delete lifecycle and add cleanup support for seven-day completed
  retirement.

## UI / Platform Impact

- Countdown cards use the cover image as the primary card background when
  present, otherwise a light preset fallback visual.
- Create flow includes optional cover upload, alert add/remove controls, and no
  default alert row.
- There is no edit surface after create; if a user needs a different countdown,
  they delete and recreate it.

## Observability

- Background-job logs must identify queued countdown notifications and cleanup
  retirements.
- Release proof should inspect notification rows, countdown-alert rows, and
  cover-asset cleanup behavior directly.

## Alternatives Considered

1. Keep the old edit flow and patch the model in place.
   Rejected because locked decisions explicitly remove edit support and require
   create/delete simplification.
