# US-ASSET-008 Overview

## Current Behavior

Note content persists a public image `src` plus `data-note-asset-id` and infers
ownership by scanning HTML and shared user-owned assets.

## Target Behavior

Each Note page owns explicit `note_page_assets` rows. Persistence keeps durable
asset ids but no provider/presigned URL. Note reads authorize the page and
hydrate short-lived image URLs; save reconciles associations exclusively.

## Affected Users

- Authenticated learners editing Notes with pasted or dropped images.

## Affected Product Docs

- `docs/product/assets.md`
- `docs/product/notes.md`

## Non-Goals

- Cross-page asset reuse.
- General attachments/file picker.
- Recycle Bin UI.

