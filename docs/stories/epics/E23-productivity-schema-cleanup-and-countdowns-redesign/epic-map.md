# Epic Map: Productivity Schema Cleanup And Countdowns Redesign

Mode: `high_risk_feature`

## Feature Outcome

FluentA removes retired Todo, Kanban, and Journal schema-dependent behavior,
cuts Countdown over to a create/delete-only date-based model with Vietnam-local
multi-alert scheduling, and reuses the shared asset lifecycle for one optional
countdown cover image.

## Architecture / Reality Basis

- Todo still mutates `date`, `sortOrder`, `isCarriedOver`, and
  `originalDate`, and the week UI still supports reorder and cross-day drag.
- Countdown still exposes `/countdown` UX assumptions from `US-COUNTDOWN-001`:
  target date-time, edit support, optional color/icon styling, and one
  `alerted_at` completion marker.
- Journal still stores and exposes `plain_text_content`, `learning_date`, and
  `/api/v1/journals` naming, while list/search behavior depends on rich preview
  text and content search.
- Kanban still stores tags, title search, and card-tag UI even though the new
  contract keeps only `title`, `description`, `priority`, and `deadline`.
- Shared asset infrastructure already supports owner-scoped presign, finalize,
  list, delete, and cleanup flows for `avatar`, which Feature 22 must reuse for
  `countdown-cover`.

## Epics

| Epic | Capability / Risk Area | Why It Exists | Stories | Proof Needed |
| --- | --- | --- | --- | --- |
| E23-A | Productivity schema and contract cleanup | Remove retired Todo, Kanban, and Journal fields/contracts without leaving stale API/UI logic behind | US-PROD-001 | migration/script review, backend/frontend regression, stale-identifier scan |
| E23-B | Countdown redesign and alert scheduling | Replace the old countdown model with date-based alerts, fixed Vietnam-time scheduling, and optional shared-asset cover upload | US-PROD-002 | domain/application/integration proof, asset lifecycle smoke, UI flow proof |
| E23-C | Release reconciliation | Prove removed identifiers, route cutovers, background-job behavior, and product-doc alignment | US-PROD-003 | matrix evidence, focused E2E, static cleanup audit, release script review |

## Story Queue

| Story | Epic | Outcome | Depends On | Feasibility Status |
| --- | --- | --- | --- | --- |
| US-PROD-001 | E23-A | Todo, Kanban, and Journal durable/API/UI contracts match Feature 22 cleanup decisions | none | Ready to implement |
| US-PROD-002 | E23-B | Countdown uses `countdowns` + alerts + optional cover asset with create/delete-only workflow | US-PROD-001 for shared cleanup context, but backend may start in parallel where safe | Ready to implement |
| US-PROD-003 | E23-C | Release proof closes migration, route, cleanup-job, and stale-identifier risk | US-PROD-001, US-PROD-002 | Ready after both slices land |

## Current Story To Prepare

`US-PROD-001` - Clean up Todo, Kanban, and Journal schema and contracts.

Why now:

- It removes the stale durable/API/frontend assumptions that would otherwise
  leak through Countdown-adjacent navigation and release proof.
- It cuts the retired fields before the countdown migration adds more schema
  churn to the same release.
- It refreshes product truth for three existing productivity surfaces that are
  currently out of sync with the locked Feature 22 context.
