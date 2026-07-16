# US-ASSET-010 Overview

## Current Behavior

Avatar, Note image, and Countdown deletion mark assets deleted and attempt
immediate object deletion, with no recovery window or purge claim state.

## Target Behavior

Feature detach/replace archives the asset for 30 days and revokes downloads
immediately. An hourly job conditionally claims expired archives, deletes
objects idempotently, marks success deleted, and retries failures.

## Affected Users

- All authenticated users removing or replacing supported media.

## Affected Product Docs

- `docs/product/assets.md`
- Auth, Notes, and personal productivity contracts.

## Non-Goals

- Archived list, Restore, manual/admin purge, or Recycle Bin UI.

