# Overview

## Current Behavior

Feature 20 implementation stories through `US-BC-007` are in place, but the
epic still needs one release-proof pass that exercises the shipped learning
surface as a whole:

- Flashcard viewer remains the read-only page-deck surface
- Practice owns summaries, settings, and Add to Review
- Review owns due queues, sessions, answers, settings, and dashboard/stats
- Vocabulary now syncs Flashcard cards and Review cleanup through dedicated
  ports
- old mixed backend route families should be absent from active code and
  runtime proof

Focused proof already exists in earlier stories, but it is split across
backend, frontend, and schema-cutover work.

## Target Behavior

`US-BC-008` closes the epic with one release-oriented validation pass that
shows the bounded-context split behaves coherently across:

- Flashcard viewer
- Practice
- Add to Review
- Review
- dashboard/stats
- unified settings
- schema ownership
- endpoint removal

## Affected Users

- maintainers deciding whether Feature 20 is production-shaped enough to move
  forward
- reviewers validating that the split did not leave mixed contracts behind

## Affected Product Docs

- `SPEC.md` Section 20
- `docs/product/flashcards.md`
- `docs/product/learning-workflows.md`
- `docs/stories/epics/backend-bounded-context-split/epic-map.md`

## Non-Goals

- redesigning learning workflow behavior
- adding new bounded-context functionality
- introducing separate deployable services or async integration infrastructure
