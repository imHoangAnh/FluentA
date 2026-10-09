# Execution Plan: Pronunciation syllable feedback

Date: 2026-10-09

## Status

Completed

## Outcome

Practice and Review show one row of colored syllables beneath the existing
word/phrase heading. Hover, keyboard focus, or tap opens a tooltip containing colored
phonemes only. Neither surface displays scores, a color legend, repeated word
labels, or assessment sentences.

## Context

- Authority: user accepted the interactive pronunciation demo in this chat.
- User clarification: keep current correctness and Continue rules; red is feedback.
- [Workflow](../../WORKFLOW.md), [Practice](../../product/practice.md).
- Provider: `AzurePronunciationAssessmentProvider` and response parser.
- UI: shared `PronunciationFeedback`, Practice and Review mode surfaces.

## Scope

In scope: syllable/phoneme parsing and additive assessment fields; shared feedback
and accessible tooltip; existing Practice/Review integration; focused tests and
browser checks against mocked API/audio.

Out of scope: grading thresholds, retry limits, routes, database migrations,
provider configuration, deployment, and unrelated working-tree changes.

## Approach

1. Preserve syllable scores and map sibling phonemes by provider timestamps.
2. Add optional contract fields so saved older assessments remain readable.
3. Render syllables and tooltip in both modes, including successful assessments.
4. Remove pronunciation assessment prose while preserving other exercise modes.
5. Validate parsing, color boundaries, keyboard/touch behavior, recovery and
   Review's two-attempt flow; build and report proof limits.

## Risks And Recovery

- Older saved assessments lack syllables: show a combined word sound with its
  existing phonemes in the tooltip; do not invent syllable boundaries.
- Provider layouts vary: support sibling timestamp-aligned phonemes and nested
  phonemes; retain word fallback when detailed data is unavailable.
- Keyboard shortcuts must not steal tooltip focus or turn Escape into Skip.
- Recovery: revert only this task's diff, never unrelated local changes.

## Progress

- [x] Inspect repository authority and current implementation.
- [x] Confirm correctness and retry policy with user.
- [x] Implement provider and contract.
- [x] Implement shared UI and Practice/Review integration.
- [x] Validate and record results.

## Decisions

- 2026-10-09: Score > 80 is green; 60 through 80 inclusive is yellow; < 60
  is red. Scores are internal only. User explicitly keeps existing correctness.
- 2026-10-09: Do not enable prosody or replace accuracy with PronScore.

## Validation

- Focused proof: backend parser/service tests and frontend feedback tests.
- Browser proof: real frontend, mocked API and microphone; no live Azure claim.
- Repository checks: backend tests, frontend tests, lint and production build.

## Result

Implemented optional syllables and raw phoneme accuracy in the assessment contract.
Azure sibling phonemes are grouped by absolute start timestamps with an exclusive
syllable end. Nested and older flat responses still work. No grading change,
database migration, provider configuration change, commit, push, or deployment.

Shared feedback is shown for both correct and incorrect assessments. Scores and
assessment prose are hidden. Hover, focus, touch, Escape, outside dismissal,
responsive placement, and keyboard shortcut isolation are implemented. Practice
recovery retains server feedback; Review retains the assessed item until Continue.

Validation on 2026-10-09:

- `dotnet test src/backend/FluentA.slnx --no-restore`: 287 passed, 17 integration
  tests skipped by existing environment requirements. Pronunciation subset: 24 passed.
- `node node_modules/vitest/vitest.mjs run --maxWorkers=2` (frontend): all
  158 tests in 33 files passed. Default parallel run exposed one Notes timeout;
  no Notes code or test timeout was changed. Old recovery prose assertion was
  updated to verify the actual recovered syllable assessment instead.
- `npm run lint` and `npm run build` (frontend): passed. Final changed E2E
  and pronunciation/recovery files also passed scoped lint.
- E32 Playwright: 6 passed in Edge, with desktop and 320px touch configurations.
  Real frontend on isolated HTTPS port 5174; mocked API and microphone. Verified
  Practice retries/provider errors, keyboard traversal, Escape, tap, viewport
  bounds, recap, Review two attempts, and Continue despite red feedback.
- Supplied countryside/phrase outputs are regression fixtures. JSON history
  roundtrip and old optional-field-free history both deserialize successfully.
- Scoped `git diff --check`: passed after removing one trailing blank line.

Browser runner used a temporary external config in the task visualization folder
with `channel: 'msedge'`. Screenshots are retained there. No live Azure, physical
microphone, database integration, or other browser-engine proof is claimed.
Only the Vite process started for this task was stopped; pre-existing dirty work
was preserved.
