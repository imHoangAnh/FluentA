# E32 Current Story Pack

## Current Story

- ID: `US-PR-001`
- Title: Scored pronunciation and Practice/Review session redesign
- Lane: high-risk
- Status: implemented and reviewed on 2026-07-20

## Objective

Deliver the approved Practice and Review experience end to end without
exposing Azure credentials, storing learner audio, changing FluentA SRS
intervals, or corrupting existing local due dates.

## Inputs

- `context.md` D1-D11
- `approach.md`
- `story-map.md`
- `US-PR-001-scored-pronunciation-session-redesign/overview.md`
- `US-PR-001-scored-pronunciation-session-redesign/design.md`
- `US-PR-001-scored-pronunciation-session-redesign/execplan.md`
- `US-PR-001-scored-pronunciation-session-redesign/validation.md`

## Gate

The user approved the validated plan. Implementation and required proof are
complete. A credentialed Azure call remains an explicit operator smoke test;
automated provider proof uses deterministic HTTP fakes so tests never consume
paid quota.
