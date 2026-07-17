# US-ASSET-007 Validation

Validated: 2026-07-17

## Result

**READY WITH CONSTRAINTS**

The current codebase has the required vertical seams: an S3-compatible MinIO
adapter, shared presign/finalize lifecycle, Auth-owned avatar FK, Settings UI,
EF Core migrations, and runnable local PostgreSQL/MinIO/Redis. The current
implementation is deliberately public-URL based, so this story must replace
that contract rather than add a compatibility path.

## Reality-Gate Matrix

| Assumption | Risk | Evidence | Result |
| --- | --- | --- | --- |
| A provider-neutral storage seam exists | The migration could require a cross-cutting provider rewrite | `IAssetObjectStorage` is implemented by `MinioAssetObjectStorage`; its existing AWS S3 client already uses `GetPreSignedURL` for PUT and metadata/delete operations | READY |
| Private delivery can use MinIO in the existing local topology | Anonymous download may be required by a hidden client path | `docker compose -f docker-compose.dev.yml config --quiet` passed; live `fluenta-minio`, PostgreSQL, and Redis are up; a read-only `mc anonymous get` reports `download` for `fluenta-assets-dev` | READY WITH CONSTRAINTS |
| Bucket-private cutover is observable | Activating private policy before all consumers migrate would break Note and Countdown public URLs | The bootstrap contains `mc anonymous set download`; US-ASSET-008 and US-ASSET-009 still depend on that shared bucket. US-ASSET-011 will replace it with private policy and prove unauthenticated GET denial plus authorized short-lived GET | READY WITH CONSTRAINTS |
| Avatar is a coherent first vertical slice | Auth and Settings may be unable to stop exposing durable URLs together | `auth_users.current_avatar_asset_id`, `AuthService`, auth DTOs, `SettingsPage`, `avatar-assets.api.ts`, and `getUserAvatarUrl` are concrete, bounded consumers | READY |
| The schema can evolve without violating the approved migration boundary | US-ASSET-007 could accidentally perform the approved destructive reset early | `dotnet ef migrations list` succeeds and includes the current asset foundation. This story is limited to additive/transition-safe changes; all destructive deletion/reset remains exclusively in US-ASSET-011 | READY WITH CONSTRAINTS |
| The affected backend baseline is usable | Existing failures could mask a regression | Domain tests: 39/39 pass; application tests: 111/111 pass; API build passes | READY |
| The affected frontend slice is usable | Existing frontend failures could block a reliable cutover | `SettingsPage.test.tsx`: 2/2 pass. The complete frontend suite has three unrelated failing assertions and the frontend build is blocked by unused imports in the user-modified `ReviewSessionPage.tsx` | READY WITH CONSTRAINTS |

## Baseline Commands And Results

```text
dotnet test src/backend/FluentA.Domain.UnitTests/FluentA.Domain.UnitTests.csproj --no-restore
# PASS: 39 passed, 0 failed

dotnet test src/backend/FluentA.Application.UnitTests/FluentA.Application.UnitTests.csproj --no-restore
# PASS: 111 passed, 0 failed

dotnet build src/backend/FluentA.API/FluentA.API.csproj --no-restore
# PASS, 0 errors; pre-existing NU1903 warning for Microsoft.OpenApi 2.0.0

docker compose -f docker-compose.dev.yml config --quiet
docker compose -f docker-compose.dev.yml ps
# PASS: compose parses; PostgreSQL, Redis, and MinIO are running

dotnet ef migrations list --project src/backend/FluentA.Infrastructure/FluentA.Infrastructure.csproj --startup-project src/backend/FluentA.API/FluentA.API.csproj --no-build
# PASS: current migration chain is discoverable

npm --prefix src/frontend run test:run -- src/test/settings/SettingsPage.test.tsx
# PASS: 2 passed, 0 failed
```

The full frontend baseline is not green:

```text
npm --prefix src/frontend run test:run
# FAIL: route-feedback.test.tsx (2 assertions) and protected-route.test.tsx (1 assertion)

npm --prefix src/frontend run build
# FAIL: unused Link and Button imports in src/frontend/src/features/review/ReviewSessionPage.tsx
```

Those failures are outside this story. `ReviewSessionPage.tsx` was already
modified in the worktree and must not be changed by US-ASSET-007 without
separate approval.

## Implementation Proof Required

| Layer | Cases |
| --- | --- |
| Unit | State transitions; generated key/extension; claimed size/MIME limits; HEAD/signature mismatch; uploader/type/status validation |
| Integration | Target schema constraints; authenticated presign/finalize; private MinIO PUT/GET; anonymous denial; foreign-user `404` |
| Frontend | Settings save/retry; no `avatarUrl`/`publicUrl`; URL expiry refetch/fallback |
| E2E | Upload, reload, render through presigned GET, replace/remove, and second-user denial |
| Platform | Private Compose bucket and configured-origin CORS only |
| Security | No client bucket/key input; no URL/secret logs; spoofed MIME/signature and oversize rejection |

## Fixtures

- Two authenticated users.
- Valid tiny PNG/WebP, MIME-spoofed bytes, empty file, and over-limit object.
- Disposable PostgreSQL schema and private MinIO bucket.

## Constraints And Stop Conditions

1. Do not perform the destructive asset reset, delete legacy objects, or drop
   legacy URL columns in this story; those actions belong to US-ASSET-011.
2. Do not add a generic asset-download authorization bypass. Auth must issue
   the Avatar download URL after feature authorization.
3. Do not switch the shared bucket policy in US-ASSET-007. It is a coordinated
   US-ASSET-011 release gate after Notes and Countdown stop depending on public
   URLs.
4. Do not claim a complete frontend green baseline until the unrelated route
   test expectations and `ReviewSessionPage.tsx` worktree change are resolved
   by their owner or separately approved.
5. Stop implementation if private MinIO denies an SDK-signed PUT/GET because
   no feature-scoped replacement is available, or if bounded signature
   inspection cannot be implemented without full-object unbounded reads.

## Approved Implementation Boundary

The approved slice was **US-ASSET-007 only**: private,
provider-neutral storage foundation plus the end-to-end Avatar cutover. It does
not authorize Notes, Countdown, archive/purge, or the release-wide destructive
reset.

## Implementation Evidence (2026-07-17)

- `dotnet test src/backend/FluentA.Application.UnitTests/FluentA.Application.UnitTests.csproj --no-restore`: **113 passed**.
- Asset tests cover controlled key generation, claimed MIME/size/name validation,
  a PNG MIME-spoofed object whose GIF bytes are rejected at finalize, bounded
  signature inspection, and the `pending-upload -> ready` transition.
- `dotnet build src/backend/FluentA.API/FluentA.API.csproj --no-restore`:
  **passed**; the existing `Microsoft.OpenApi` NU1903 warning remains.
- `npm --prefix src/frontend run test:run`: **17 files, 64 tests passed**.
- `npm --prefix src/frontend run lint`: **passed**.
- `npm --prefix src/frontend run build`: **passed**; existing dependency-only
  SignalR/Rolldown pure-annotation warnings remain.
- `npm --prefix src/frontend audit --omit=dev --audit-level=high`: **0
  vulnerabilities**.
- EF migration `20260716184235_AddAssetUploadMetadata` was generated and
  applied locally. PostgreSQL proof for a disposable upload returned
  `fluenta-assets-dev|e31-avatar.png|Ready` for
  `bucket|original_name|status`.
- Direct API/MinIO runtime proof used two disposable authenticated users:
  owner `presign -> PUT -> finalize -> profile attach -> signed GET` returned
  `status=ready`, signed GET **200**, and foreign avatar attach **404**. The
  profile response did not contain `avatarUrl`.
- Playwright browser proof passed:
  `npx playwright test e2e/settings-account-learning.spec.js --grep
  'Settings avatar uploads'` (**1 passed**). It uploads through Settings,
  renders the `X-Amz-Algorithm` signed URL, verifies `/auth/me` omits
  `avatarUrl`, and reloads to obtain a usable signed avatar URL.
- The pre-existing route assertions were reconciled in the separately scoped
  local commit `14390c6`; the restored ProtectedRoute status prevents an
  idle/checking session from redirecting to Login before `loadMe()` completes.

The shared bucket remains anonymous-download until US-ASSET-011 by the
coordinated release gate. This story proves feature-authorized signed Avatar
delivery and removes durable Avatar URLs from the client/profile contract; the
temporary legacy `public_url` storage remains only for unfinished Note and
Countdown consumers and is not exposed by Avatar APIs.
