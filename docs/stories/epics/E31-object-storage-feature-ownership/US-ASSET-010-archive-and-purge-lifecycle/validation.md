# US-ASSET-010 Validation

## Proof Strategy

Prove immediate access revocation, 30-day retention, idempotent purge, and
retryable provider failure across Avatar, Notes, and Countdown.

## Test Plan

| Layer | Cases |
| --- | --- |
| Unit | valid/invalid transitions, exact retention cutoff, READY-only downloads |
| Integration | atomic feature detach/archive; concurrent claim winner; failed delete remains retryable |
| Platform | hourly Hangfire registration; real MinIO delete and retry simulation |
| Logs | bounded structured counts without URLs/secrets |

## Fixtures

- Ready, archived-not-due, archived-due, pending-deletion, and deleted assets.
- Storage adapter that succeeds, returns not-found, or throws transient failure.

## Commands

```text
dotnet test src/backend/FluentA.Domain.UnitTests/FluentA.Domain.UnitTests.csproj
dotnet test src/backend/FluentA.Application.UnitTests/FluentA.Application.UnitTests.csproj
dotnet build src/backend/FluentA.API/FluentA.API.csproj
```

## Validation Readiness

| Assumption | Risk | Evidence | Result |
| --- | --- | --- | --- |
| Archive state can be modeled durably | Status exists but retention timestamps do not | `AssetStatus` already has `Archived` and `PendingDeletion`; migration must add `archived_at` and `purge_after_at` plus a status/due index | READY WITH CONSTRAINTS |
| Feature detach can commit with archive | Repository methods save eagerly | Feature repositories share the scoped `AppDbContext`; tracked detach and archive changes can be persisted by one feature save when no storage call is inside it | READY WITH CONSTRAINTS |
| Purge can avoid duplicate object deletes | Concurrent workers could claim the same archive | `ExecuteUpdate` can conditionally transition each due `ARCHIVED` row to `PENDING_DELETION`; only rows whose update count is one are processed | READY |
| Retry is available | Storage failure must not expose or lose the asset | `IAssetObjectStorage.DeleteIfExistsAsync` is idempotent and throws `AssetStorageUnavailableException`; failed claims can return to `ARCHIVED` with the existing due time | READY |
| Hourly execution is available | Lifecycle could be implemented but never run | `ScheduledProductivityJobs` and Hangfire registration already run pending asset cleanup hourly | READY |

## Acceptance Evidence

- Applied `20260716194255_AddAssetArchiveRetention` to local PostgreSQL and
  verified both retention columns plus `IX_assets_status_purge_after_at`.
- Domain suite: 40 passed, including ready/archive/claim/requeue/deleted state
  transitions and the exact 30-day cutoff.
- Application suite: 117 passed, including archive-on-avatar, Note, and
  Countdown detachments plus a successful/failed purge batch retry test.
- Frontend suite: 17 files and 64 tests passed with one worker after the known
  default-pool Vocabulary timeout; API/frontend builds passed with existing
  `NU1903` Microsoft.OpenApi and SignalR annotation warnings.
- `archived-asset-purge` is registered hourly at minute 30. Its job logs only
  bounded claimed/deleted/failed counts and uses idempotent object deletion.
