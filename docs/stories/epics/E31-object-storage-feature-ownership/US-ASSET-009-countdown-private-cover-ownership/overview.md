# US-ASSET-009 Overview

## Current Behavior

Countdown create links a finalized cover id, but list resolves and returns the
asset's stored public URL; delete physically retires the object best-effort.

## Target Behavior

Countdown remains the exclusive owner of one ready cover asset. Countdown reads
authorize the owner and return only a short-lived cover download URL. Delete
detaches the cover for archive instead of immediate physical deletion.

## Affected Users

- Authenticated learners creating, viewing, and deleting Countdown events.

## Affected Product Docs

- `docs/product/assets.md`
- `docs/product/personal-productivity.md`

## Non-Goals

- Countdown editing or cover replacement UI beyond current behavior.
- Restore UI/API.

