# US-ASSET-010 Design

## Domain Model

Implement `READY -> ARCHIVED -> PENDING_DELETION -> DELETED`, 30-day retention,
download denial outside READY, and a domain restore transition reserved for a
future application feature.

## Application Flow

Feature detach and archive commit together. The hourly job selects bounded
batches, atomically claims rows only from ARCHIVED, attempts idempotent delete,
marks success DELETED, and leaves failure retryable without exposing URLs.

## Interface Contract

No new public archive API. Existing delete/replace endpoints retain their
feature semantics while physical purge becomes asynchronous.

## Data Model

Use indexed `(status, purge_after_at)` scans, timestamps, and conditional claim
updates. Preserve deleted metadata for audit; database hard-delete retention is
outside this story.

## Observability

Structured job summaries include claimed/deleted/failed counts and asset ids;
never log presigned URLs or secrets.

## Alternatives Considered

1. Immediate delete. Rejected by D12.
2. Hold a database transaction open during provider delete. Rejected because
   external latency/failure would lock product writes.

