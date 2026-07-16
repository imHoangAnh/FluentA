# US-ASSET-009 Design

## Domain Model

`countdowns.cover_asset_id` is the feature-owned nullable FK. The selected
asset must be ready, type `countdown-cover`, uploaded by the current user, and
not attached elsewhere.

## Application Flow

Create validates and attaches the ready cover. List/get generates a presigned
GET only after owner-scoped Countdown lookup. Delete clears the relationship;
US-ASSET-010 owns the subsequent archive transition and purge transaction.

## Interface Contract

Countdown DTO replaces `coverUrl` with `coverDownloadUrl` and
`coverDownloadUrlExpiresAt` alongside durable `coverAssetId`.

## Data Model

Retain the feature FK with an index and exclusivity constraints coordinated
with other feature relationships. Old cover links are reset, not backfilled.

## UI / Platform Impact

Countdown cards render ephemeral URLs and recover by refetch/fallback after
expiry.

## Alternatives Considered

1. Return a shared asset URL. Rejected by D4 and D15.
