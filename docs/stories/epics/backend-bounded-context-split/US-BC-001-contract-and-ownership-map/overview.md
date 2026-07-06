# Overview

## Current Behavior

The product has separate Flashcard, Practice, and Review workflows, but the
backend implementation is still concentrated in the existing Flashcards module.
One controller/service/repository path currently owns deck reads, practice
summaries, Add to Review, review sessions, review answer persistence, settings,
dashboard stats, SRS state/history, and EF table mappings.

Vocabulary also creates, updates, and deletes learning-side data through direct
Flashcard deck/card coupling. That coupling must be mapped before the backend
can be split safely.

## Target Behavior

This story produces the approved current-to-target contract map for Feature 20.
It does not move runtime code yet. The output must make later implementation
stories executable by documenting:

- current endpoints and target context-owned endpoint families
- current DTOs, service methods, repository methods, and target ownership
- current domain entities/value objects/scheduler types and target ownership
- current EF tables/configurations/indexes and target PostgreSQL schemas
- frontend API/test call sites that must change during the cutover
- Vocabulary sync/cleanup couplings that must move behind context-owned
  handlers or ports
- migration posture for local/dev and the production/user-data requirement

## Affected Users

- Maintainers and agents implementing Feature 20.
- Developers reviewing backend architecture, migrations, frontend cutover, and
  release proof.

## Affected Product Docs

- `SPEC.md` Section 20
- `docs/product/flashcards.md`
- `docs/product/learning-workflows.md`
- `docs/ARCHITECTURE.md`
- `docs/stories/epics/backend-bounded-context-split/*`

## Non-Goals

- Moving source code into new contexts.
- Creating EF migrations.
- Changing HTTP runtime behavior.
- Changing frontend runtime behavior.
- Changing Practice modes, SRS scheduling, or Review random-mode semantics.
- Introducing separate services, separate databases, a message broker, an
  outbox, or a shared Learning kernel.
