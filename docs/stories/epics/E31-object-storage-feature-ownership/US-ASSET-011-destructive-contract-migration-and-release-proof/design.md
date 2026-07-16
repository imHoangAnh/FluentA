# US-ASSET-011 Design

## Domain Model

Remove all legacy public URL and generic owner semantics. The final model keeps
private metadata, uploader audit, feature relationships, and archive lifecycle.

## Application Flow

The migration copies legacy object keys to a durable automatic deletion queue,
clears Avatar/Note/Countdown references and old rows, and drops legacy columns.
The background worker drains queued objects with retry. No old object is
reachable through application APIs during drain.

## Interface Contract

Static/OpenAPI scans must find no `publicUrl`, `avatarUrl`, `coverUrl`, generic
attached-asset download, public-base-URL builder, or old list/delete contract.

## Data Model

Final migration is intentionally irreversible for data. It establishes target
columns/indexes/FKs, clears legacy relations/content, and retains operational
deletion evidence until the queue drains.

## UI / Platform Impact

Backend/frontend deploy together; MinIO anonymous policy is removed; all three
surfaces use ephemeral URLs. Release requires downtime/readiness ordering.

## Observability

Capture before/after DB row counts, queued/deleted/failed object counts,
migration id, and private-bucket probes without logging secrets.

## Alternatives Considered

1. Backfill old data. Rejected by D9.
2. Environment guard. Rejected by D10.
3. Dual API compatibility. Rejected by D11.

