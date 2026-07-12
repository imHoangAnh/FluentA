# 0045 Habit Semantic Icons And Color Removal

Date: 2026-07-12

## Status

Accepted

## Context

Habit styling currently accepts arbitrary emoji and hex colors, which leaks
presentation choices through the domain, API, and database and creates
inconsistent rendering across Habit surfaces. The approved Habit redesign needs
a small stable icon vocabulary and shared application styling.

## Decision

Remove Habit `color` from the database, domain, API, and UI. Replace the
optional free-form icon string with required semantic `HabitIcon` values:
`Default`, `Book`, `Exercise`, `Water`, `Meditation`, `Study`, `Work`, and
`Health`. Persist and serialize enum names as strings, while the frontend owns
the mapping from semantic values to Lucide components.

Do not add destructive Habit/HabitEntry cleanup or legacy emoji mapping to the
migration. Development data will be reset manually, and legacy arbitrary icon
compatibility is not part of this change.

## Alternatives Considered

1. Hide color only in the UI while retaining it in the contract. Rejected
   because it preserves an unwanted presentation field.
2. Store Lucide component names. Rejected because it couples durable data to a
   frontend library.
3. Store enum ordinals. Rejected because reordering would change meaning and
   database values would be opaque.
4. Automatically map old emoji values. Rejected by the approved reset boundary.

## Consequences

Positive:

- Habit identity is consistent across Habit, Stats, and Dashboard surfaces.
- The API and data model no longer carry per-Habit color presentation state.
- Icon rendering can change without rewriting stored data.

Tradeoffs:

- The schema and public Habit contract change together.
- Existing arbitrary icon values are incompatible unless the database is reset
  or a separate future compatibility plan is approved.
- Adding icons later requires coordinated enum, validation, frontend mapping,
  and documentation changes.

## Follow-Up

- Validate the migration against a reset development database.
- Update `docs/product/personal-productivity.md` during implementation.
- Keep icon mapping exhaustive in frontend tests.
