# Epic Map: Learning Source-Of-Truth Redesign

Mode: `high_risk_feature`

## Feature Outcome

FluentA treats `vocab_words` as the only learning-content source of truth,
uses vocabulary pages as the learner-facing Flashcard and Practice unit, keeps
Review board-scoped on dedicated review-state rows, and removes the remaining
duplicate synchronized learning model.

## Architecture / Reality Basis

- Current Flashcard and Practice still read from `flashcard_decks` and
  `flashcard_cards`.
- Practice persistence is still keyed by `deckId` and stores summary-style
  history rather than the target page-level practiced marker.
- Review already has dedicated state, but its repositories and session flows
  still depend on deck/card joins and legacy review-history assumptions.
- The approved Feature 23 contract changes source-of-truth hierarchy, route
  naming, API shapes, persistence ownership, and cleanup expectations.

## Epics

| Epic | Capability / Risk Area | Why It Exists | Stories | Proof Needed |
| --- | --- | --- | --- | --- |
| E24-A | Page-word learning reads | Move Flashcard and Practice off synchronized deck/card reads first so later slices build on the right ownership model | US-LEARN-001 | route/API cutover, owner-scoped page reads, frontend contract proof |
| E24-B | Review state and session ownership | Replace legacy review/deck joins with `review_state` + `review_sessions` + `review_session_items` | US-LEARN-002 | migration, queue ownership, same-day resume proof |
| E24-C | Practice reset workflow | Rebuild Practice around recap-time Add to Review, practiced markers, and no-resume behavior | US-LEARN-003 | per-word add/re-add, practiced badge, persistence proof |
| E24-D | Review queue and Level 5 management | Rebuild board review, overflow handling, and Level 5 settings on the new state model | US-LEARN-004 | queue ordering, modal, overflow, settings proof |
| E24-E | Release reconciliation | Remove stale identifiers, legacy tables, route fallout, and cleanup gaps | US-LEARN-005 | migration review, static scan, focused E2E, matrix proof |

## Story Queue

| Story | Epic | Outcome | Depends On | Feasibility Status |
| --- | --- | --- | --- | --- |
| US-LEARN-001 | E24-A | Flashcard and Practice read active board/page/word data directly and expose page-based contracts | none | Ready to implement |
| US-LEARN-002 | E24-B | Review state/session ownership no longer depends on flashcard deck/card tables | US-LEARN-001 | Ready after page-based cutover |
| US-LEARN-003 | E24-C | Practice recap, Add to Review, and practiced state match the new page-owned model | US-LEARN-001, US-LEARN-002 | Ready after ownership cutover |
| US-LEARN-004 | E24-D | Review queues, resume modal, overflow handling, and Level 5 settings match the target contract | US-LEARN-002 | Ready after state/session cutover |
| US-LEARN-005 | E24-E | Cleanup proof closes migration, route, settings, and stale identifier risk | US-LEARN-001, US-LEARN-002, US-LEARN-003, US-LEARN-004 | Ready after slices land |
