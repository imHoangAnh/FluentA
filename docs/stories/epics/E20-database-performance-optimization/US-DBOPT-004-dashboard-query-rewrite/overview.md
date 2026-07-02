# Overview

## Current Behavior

`EfFlashcardRepository.GetDashboardAsync` loaded active page-deck cards,
review states, and review histories into memory, then computed totals,
retention, streak, and forecast in the API process.

## Target Behavior

Dashboard aggregation uses server-side `COUNT`, `GROUP BY`, and `EXISTS`
queries with bounded forecast day checks. The returned DTO remains unchanged.

## Affected Users

- Learners viewing Flashcard dashboard and Dashboard Overview.
- Maintainers preserving Feature 16 SRS behavior.

## Affected Product Docs

- `docs/product/database-performance.md`
- `docs/product/flashcards.md`
- `docs/product/learning-workflows.md`

## Non-Goals

- Changing dashboard cards, copy, routes, or response fields.
- Rewriting Practice or Review session creation.
