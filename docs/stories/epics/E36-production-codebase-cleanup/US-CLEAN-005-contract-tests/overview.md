# US-CLEAN-005 Contract Test Repair

## Goal

Bring unit, integration, and E2E tests in line with the current supported
contracts after cleanup, without dropping coverage for retained workflows.

## Acceptance Criteria

1. All E2E files are audited for stale ports, auth flow, routes, selectors, and
   endpoint assumptions.
2. Countdown tests cover durable one-time completion and recurring occurrence
   behavior.
3. Tests for removed behavior are deleted only with the corresponding code.
4. Full Vitest and relevant Playwright suites pass deterministically.
