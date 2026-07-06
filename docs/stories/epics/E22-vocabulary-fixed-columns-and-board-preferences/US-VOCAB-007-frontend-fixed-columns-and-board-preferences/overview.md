# Overview

## Current Behavior

The vocabulary workspace still renders E05 optional/custom columns, exposes the
custom-column settings menu, stores drag order in local storage, and does not
persist column widths through the backend.

## Target Behavior

The vocabulary workspace renders only the fixed Feature 21 columns, removes
custom-column creation/deletion UI, supports hide/show for nullable fixed
columns, persists board-wide order and widths through the backend preference
row, and scrolls horizontally when the table exceeds the viewport.

## Affected Users

- Authenticated learners using the vocabulary workspace.

## Affected Product Docs

- `docs/product/vocabulary-board.md`

## Non-Goals

- Backend migration details.
- Review or Practice UI redesign.
