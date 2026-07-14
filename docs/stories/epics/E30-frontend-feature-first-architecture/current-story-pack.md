# E30 Current Story Pack

## Current Story

- ID: `US-FE-003`
- Title: Settings feature composition
- Lane: high-risk
- Status: implemented and reviewed on 2026-07-14; pending local smart commit

## Objective

Move the protected Settings route family into `features/settings`, expose its
lazy nested route objects through the Settings public API, and remove the
Settings legacy manifest entry without changing profile/avatar, Practice,
Review, or Level 5 behavior.

## Inputs

- `context.md` D1-D17
- `approach.md`
- `story-map.md`
- `US-FE-003-settings-feature-composition/overview.md`
- `US-FE-003-settings-feature-composition/design.md`
- `US-FE-003-settings-feature-composition/validation.md`

## Gate

High-risk validation, implementation, review, unit/integration/E2E/platform
proof, and structural scans passed on 2026-07-14. This story must receive its
own local smart commit before US-FE-004 opens.
