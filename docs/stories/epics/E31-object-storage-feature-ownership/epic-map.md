# Epic Map: Object Storage Feature Ownership

Mode: `high_risk_initiative`

## Feature Outcome

FluentA stores provider-neutral private asset metadata in `assets`, lets Auth,
Notes, and Countdown own enforceable business relationships, renders media
through short-lived authorized download URLs, archives detached assets for 30
days, and purges them asynchronously through MinIO today without preventing a
future S3-compatible adapter.

## Story Queue

| Story | Outcome | Depends on | Exit proof |
| --- | --- | --- | --- |
| US-ASSET-007 | Provider-neutral private delivery foundation is demonstrated end to end through Avatar upload, attachment, authorization, and Settings rendering | none | domain/application tests, migration feasibility, signed-GET adapter/authorization proof, foreign-user denial, focused Settings test/build |
| US-ASSET-008 | Note pages own exclusive image associations and hydrate private image URLs without persisting `src` URLs | US-ASSET-007 | Note ownership/sanitizer tests, association constraints, route tests, reload browser proof |
| US-ASSET-009 | Countdown owns one private cover and returns an ephemeral authorized URL | US-ASSET-007 | Countdown tests, FK/ownership proof, frontend render and cross-user denial |
| US-ASSET-010 | Delete/replace archives assets for 30 days and an hourly job claims, retries, and purges expired objects | US-ASSET-007, US-ASSET-008, US-ASSET-009 | state-machine tests, atomic detach/archive integration, concurrent claim/retry MinIO proof |
| US-ASSET-011 | Destructive reset, legacy URL removal, private bucket cutover, docs, and full release proof are reconciled | US-ASSET-008, US-ASSET-009, US-ASSET-010 | seeded legacy migration, deletion-queue drain, static/OpenAPI scan, backend/frontend/E2E/platform proof |

## Current Story

`US-ASSET-007` is the smallest believable first slice because Avatar already
has a complete upload/save UI and one feature-owned FK. It can prove the new
storage seam, signed delivery, authorization, and browser behavior before the
more complex Note association and archive concurrency work. The shared bucket
cannot become private until US-ASSET-008 and US-ASSET-009 have eliminated their
public URL dependencies; that policy activation remains US-ASSET-011.

## Story Invariants

- No story is released independently; D11 requires coordinated cutover.
- Temporary internal compatibility needed between story checkpoints must be
  removed by US-ASSET-011 and must not be documented as product behavior.
- Every attached-asset download is authorized by its owning feature.
- Only `READY` assets are attachable or downloadable.
- Old assets are reset, not backfilled.
- The existing user change in `ReviewSessionPage.tsx` stays outside E31.
