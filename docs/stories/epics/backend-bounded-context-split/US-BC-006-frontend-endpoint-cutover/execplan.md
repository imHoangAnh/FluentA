# Exec Plan

## Goal

Cut the active frontend learning surfaces over to the new Practice and Review
endpoint families after the backend controller split.

## Scope

In scope:

- update frontend API client routes
- update frontend React Query keys for Practice/Review owned state
- update focused Vitest and Playwright/spec call sites that still reference
  removed mixed endpoints
- update schema-aware review test seed helpers that still target legacy table
  names
- run frontend proof and focused route-aligned smoke

Out of scope:

- backend controller/service changes
- broad Playwright locator modernization outside endpoint ownership work
- vocabulary sync/cleanup split
- full release proof

## Risk Classification

Risk flags:

- public API contract consumption change
- frontend settings/dashboard ownership cutover
- test and seed helpers tied to old backend contracts
- local proof depends on the schema-split migration state from `US-BC-004`

Lane: high-risk.

## Work Phases

1. Inventory remaining frontend and test references to removed mixed routes.
2. Update client routes and React Query ownership.
3. Update focused frontend proof files to the new endpoint families.
4. Repair local runtime schema state if needed for proof after `US-BC-004`.
5. Run frontend lint, Vitest, build, and focused route-aligned proof.
6. Record which failures are true cutover regressions versus unrelated stale
   UI/test drift.
