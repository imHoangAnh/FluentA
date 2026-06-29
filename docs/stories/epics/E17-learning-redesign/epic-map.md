# Epic Map: Learning Redesign

Mode: `high_risk_feature`

## Feature Outcome

FluentA exposes separate Flashcard, Practice, and Review workflows, no longer
depends on All Words decks, stores SRS state on vocabulary-linked review rows,
and reuses Feature 13 interactions inside the new Practice and Review flows.

## Architecture / Reality Basis

- Current frontend and backend still treat `AllWords` as a first-class deck
  type.
- Current Practice is implemented and reusable but persists summary-only data.
- Current Review and dashboard behavior still depend on flashcard-card
  scheduling and All Words deck semantics.
- The approved redesign changes both product behavior and durable data
  ownership, so sequencing must protect migration and regression proof.

## Epics

| Epic | Capability / Risk Area | Why It Exists | Stories | Proof Needed |
| --- | --- | --- | --- | --- |
| E17-A | Deck model and sync reset | Remove the superseded All Words foundation before downstream UI work | US-LR-002 | migration, sync, ownership, dashboard fallout proof |
| E17-B | Review-state ownership | Move SRS state to vocabulary-linked review rows with destructive migration | US-LR-003 | EF migration, deletion, queue ownership proof |
| E17-C | Learning surface split | Expose the approved menu split and stop routing users through mixed semantics | US-LR-001, US-LR-004 | focused route and viewer proof |
| E17-D | Practice reset workflow | Reuse Feature 13 interactions but change persistence to full-session review-state writes | US-LR-005 | batch-completion and abandonment proof |
| E17-E | Review due-word workflow | Build board-scoped due queues, session settings, overflow behavior, and automatic scoring | US-LR-006 | queue ordering, overflow, and immediate persistence proof |
| E17-F | Release reconciliation | Close cross-feature fallout after the redesign lands | US-LR-007 | end-to-end regression and matrix proof |

## Story Queue

| Story | Epic | Outcome | Depends On | Feasibility Status |
| --- | --- | --- | --- | --- |
| US-LR-002 | E17-A | Sync and read surfaces return only page decks and no All Words deck leakage remains | none | Needs validation |
| US-LR-003 | E17-B | Dedicated review-state storage owns SRS lifecycle and destructive migration | US-LR-002 | Needs validation |
| US-LR-001 | E17-C | Protected navigation exposes Flashcard, Practice, and Review as separate learning entries | US-LR-002 | Needs validation |
| US-LR-004 | E17-C | Flashcard becomes a read-only one-card page-deck viewer with Let's practice redirect | US-LR-001, US-LR-002 | Needs validation |
| US-LR-005 | E17-D | Practice uses global mode sequence, recap, and batch review-state completion | US-LR-002, US-LR-003 | Needs validation |
| US-LR-006 | E17-E | Review runs board-scoped due-word sessions with global settings and immediate persistence | US-LR-003, US-LR-001 | Needs validation |
| US-LR-007 | E17-F | Release proof covers migration, speech reuse, dashboard effects, and no All Words regressions | US-LR-004, US-LR-005, US-LR-006 | Needs validation |

## Current Story To Prepare

`US-LR-002` - Remove All Words deck behavior and migrate flashcard sync to
page-deck-only.

Why now:

- It removes the superseded product model that currently blocks every other
  approved behavior.
- It lets later stories validate against the right deck shape instead of
  carrying compatibility branches.
- It exposes the biggest migration and dashboard fallout earliest.

Planning has chosen the smallest work shape. Approve it before current
story/work prep. Tough work uses an epic map; beads wait until feasibility
passes.
