# E30 Current Story Pack

## Current Story

- ID: `US-FE-004`
- Title: Notifications feature boundary
- Lane: normal
- Status: implemented and reviewed on 2026-07-14; pending local smart commit

## Objective

Move the protected Notifications route, page, and notification API adapter into
`features/notifications`, expose its lazy route through the public API, and
remove the Notifications legacy manifest entry without changing inbox,
unread-count, or mark-read behavior.

## Inputs

- `context.md` D1-D17
- `approach.md`
- `story-map.md`
- `US-FE-004-notifications-feature-boundary/overview.md`
- `US-FE-004-notifications-feature-boundary/design.md`
- `US-FE-004-notifications-feature-boundary/validation.md`

## Gate

US-FE-004 passed normal-lane planning, validation, implementation, review,
unit/integration/E2E/platform proof, structural scans, and Harness
verification. It must receive its own local smart commit before US-FE-005
opens.
