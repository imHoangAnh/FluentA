# US-ASSET-011 Overview

## Current Behavior

Earlier E31 stories may retain transitional internal columns while consumer
cutovers are developed. The runtime still needs one reconciled destructive
migration, private bucket policy, stale-contract removal, and full proof.

## Target Behavior

Applying the release in any environment automatically clears old feature
links/data, queues and purges old objects, drops URL-era columns/contracts, and
leaves only the approved private feature-owned model.

## Affected Users

- Every deployment and every user with pre-E31 media; old media is lost.

## Affected Product Docs

- Assets, authentication, Notes, personal productivity, architecture, README
  where runtime behavior is described.

## Non-Goals

- Backfill, compatibility mode, guarded production opt-out, or data recovery.

