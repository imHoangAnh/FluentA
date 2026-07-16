# US-ASSET-011 Validation

## Proof Strategy

Rehearse the breaking release against seeded legacy state, then prove the final
application has no URL-at-rest/public-read path and all feature ownership,
archive, purge, and private-render flows remain coherent.

## Test Plan

| Layer | Cases |
| --- | --- |
| Migration | seeded old avatar/Note/cover rows and objects are reset; new constraints hold; Down cannot claim data recovery |
| Unit | full backend suites and status/authorization regressions |
| Integration | PostgreSQL + private MinIO upload/download/archive/purge and old-object queue drain |
| Frontend | Settings, Notes, Countdown focused suites plus build |
| E2E | two-user private media flows, reload/expiry behavior, delete/archive, anonymous denial |
| Contract | OpenAPI/source/DB scans contain no legacy URL fields or public policy |
| Platform | Docker config, migration apply, job registration, logs and queue observability |

## Fixtures

- Seeded pre-E31 database and MinIO objects for all three asset types.
- Fresh post-E31 users/assets plus transient provider failure.

## Commands

```text
dotnet test src/backend/FluentA.slnx
npm --prefix src/frontend run lint
npm --prefix src/frontend run test:run
npm --prefix src/frontend run build
npm --prefix src/frontend run test:e2e
dotnet tool run dotnet-ef database update --project src/backend/FluentA.Infrastructure --startup-project src/backend/FluentA.API
docker compose -f docker-compose.dev.yml config
git diff --check
```

## Validation Readiness

| Assumption | Risk | Evidence | Result |
| --- | --- | --- | --- |
| The legacy URL state is identifiable | An incomplete scan would leave a public read path | `Asset.PublicUrl`, `User.AvatarUrl`, `IAssetObjectStorage.GetPublicUrl`, `AssetStorage:PublicBaseUrl`, and the asset payload/editor consumers are live, named references | READY |
| A destructive reset can preserve deletion work | Dropping old metadata first would orphan storage objects | Every `assets.object_key` can be copied into a durable queue before the migration clears asset rows and feature links | READY WITH CONSTRAINTS |
| New assets can retain uploader audit without generic ownership language | Existing code and database use `user_id` | The current repository model isolates this column in `Asset` and `AssetConfiguration`; the final migration can rename it to `uploaded_by_user_id` while application checks remain upload-security checks | READY |
| Private bucket activation is controllable locally | The current development bucket is explicitly public | `docker-compose.dev.yml` runs `mc anonymous set download`; removing that bootstrap command produces a private MinIO bucket, while the adapter can clear an existing policy | READY WITH CONSTRAINTS |
| The breaking contract has one coordinated frontend/backend boundary | Notes still use `publicUrl` while inserting temporary editor HTML | The final frontend contract can consume a short-lived, in-memory Note download URL only for the current editor session; persisted content remains asset-id based | READY WITH CONSTRAINTS |

## Authorized Implementation

US-ASSET-011 is the approved final E31 release slice. It may intentionally
destroy prior asset metadata, Avatar/Note/Countdown links, and stored objects
after recording object keys for asynchronous deletion. It must not provide a
backfill, compatibility API, recovery switch, or environment guard.

## Acceptance Evidence

- Generated and applied `20260716195651_FinalizePrivateAssetContract` to the
  local PostgreSQL database. Before migration: `assets=21`; after migration:
  `assets=0`, `legacy_asset_deletion_queue=21`, and only
  `assets.uploaded_by_user_id` remained from the final column check.
- The migration copies object keys before removing asset rows, Note-page asset
  links, Countdown covers, current avatar links, and persisted Note image
  elements. Its `Down` method explicitly throws because recovery is not
  possible.
- `docker compose -f docker-compose.dev.yml up --no-deps minio-bootstrap`
  reported `Access permission ... is set to private`; the compose policy is
  `mc anonymous set none`. The application also enforces policy removal at
  startup and before legacy queue draining.
- Static source scan found no URL-era `publicUrl`, `avatarUrl`, `coverUrl`,
  `GetPublicUrl`, or `PublicBaseUrl` identifier outside migration history, and
  no generic Assets list/delete contract remains.
- Regression proof: `dotnet test src/backend/FluentA.slnx --no-restore`
  passed (40 domain + 115 application); frontend Vitest passed 17 files / 63
  tests with one worker; API and frontend production builds passed. Existing
  warnings are `NU1903` for Microsoft.OpenApi and SignalR annotation warnings.

## Remaining Release Proof

- The durable queue is observable locally as `pending=21`, and the five-minute
  `legacy-asset-deletion-queue` Hangfire registration is present. The desktop
  terminal wrapper terminated the API before a scheduled tick, so this run did
  not observe a live queue drain or browser E2E flow. Do not treat either as
  completed platform/browser evidence.
