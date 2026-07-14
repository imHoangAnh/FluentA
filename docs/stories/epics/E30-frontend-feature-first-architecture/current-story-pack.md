# E30 Current Story Pack

## Current Story

- ID: `US-FE-002`
- Title: Dashboard feature boundary
- Lane: normal
- Status: implemented and reviewed on 2026-07-14

## Objective

Move the authenticated home route and Dashboard UI into
`features/dashboard`, expose its lazy index route through the feature public
API, and shrink the legacy manifest without changing Dashboard behavior or
prematurely migrating its Todo, Habit, Countdown, Review, or Journal
dependencies.

## Inputs

- `context.md` D1-D17
- `approach.md`
- `story-map.md`
- `US-FE-002-dashboard-feature-boundary/overview.md`
- `US-FE-002-dashboard-feature-boundary/design.md`
- `US-FE-002-dashboard-feature-boundary/validation.md`

## Gate

The plan and implementation were approved. Normal-lane validation,
implementation, and review completed on 2026-07-14 with all unit, integration,
E2E, and platform proof passing. Adjacent feature migrations remain gated by
their own stories.
