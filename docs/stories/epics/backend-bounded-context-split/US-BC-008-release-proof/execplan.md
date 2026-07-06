# Exec Plan

## Goal

Run one release-proof pass for Feature 20 and either close the epic with
evidence or document the exact blockers that still keep it from release-ready
status.

## Scope

In scope:

- create release-proof story packet and durable Harness records
- run static scans for endpoint removal and ownership boundaries
- run backend and frontend verification commands
- run focused browser and/or direct API proof for the shipped learning flows
- repair in-scope release-proof blockers if they are caused by the Feature 20
  cutover
- record a precise validation report

Out of scope:

- broad redesign of unrelated stale UI tests
- new product behavior unrelated to the bounded-context split
- post-Feature-20 optimization or cleanup work

## Risk Classification

Risk flags:

- public API contract removal
- data ownership and schema boundaries
- existing learning workflow behavior
- multi-domain runtime regression risk
- release-readiness claim

Lane: high-risk.

## Work Phases

1. create the release-proof packet and Harness row
2. run static scans and backend/frontend compile checks
3. run focused runtime/browser and API/PostgreSQL proof
4. fix any Feature-20 regressions that block release proof
5. update matrix evidence, validation report, state, and trace
