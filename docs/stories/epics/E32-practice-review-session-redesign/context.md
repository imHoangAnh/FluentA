# E32 Practice And Review Session Redesign Context

## Status

Implemented and reviewed on 2026-07-20. Product decisions D1-D11 were approved
by the user and delivered together in `US-PR-001`; automated, migration, live
API, and responsive browser evidence is recorded in the story validation.

## Intake

- Harness intake: `96`.
- Type: high-risk change request to accepted Practice and Review behavior.
- Risk flags: external speech provider, microphone audio handling, authenticated
  API addition, database type migration, existing SRS behavior, responsive UI,
  and cross-layer contract changes.
- Affected contracts: `docs/product/learning-workflows.md` and
  `docs/product/flashcards.md`.

## Existing Behavior

- The shared learning library renders at most five square Page Deck cards per
  desktop row. Each card places its page name and word count in a spaced
  top-to-bottom layout.
- Practice typed answers use normalized exact matching. A wrong answer remains
  on the current step; the current Pronunciation step uses browser speech
  recognition and compares a visible transcript with the expected word.
- Review typed answers persist one automatic correct/wrong result immediately.
  The current Pronunciation mode uses browser speech recognition and supports
  two transcript attempts.
- Review recap behavior remains controlled by `recapAfterAnswer`: wrong answers
  recap, while correct answers recap only when the setting is enabled.
- `WordReviewState.NextReviewDate` and `WordReviewState.LastReviewedAt` use
  `DateTime`; the PostgreSQL columns therefore retain a time component.
- `word_review_histories` is actively written for Review answers and read by
  session summaries and dashboard statistics.
- `flashcard_cards` is actively synchronized from vocabulary and read by the
  Flashcard library/viewer.

## Locked Decisions

- **D1 - Azure provider.** Replace transcript-based Pronunciation evaluation
  with Azure Speech Pronunciation Assessment. Browser audio is submitted
  through the FluentA backend; Azure credentials are never exposed to the
  frontend. Request baseline scripted assessment and use `AccuracyScore` only.
  Do not enable the separately billed Prosody feature.
- **D2 - Correctness threshold.** An Azure `AccuracyScore` of 70 or greater is
  `Correct`; a lower score is `Wrong`. The UI does not display the numeric
  score or recognized transcript.
- **D3 - Practice pronunciation attempts.** A Practice pronunciation round
  permits two assessed attempts. If both are Wrong, show only the Wrong state
  plus `Retry` and `Skip`. Retry starts a fresh round of two attempts. Skip
  records the step as Wrong and advances through the existing Practice flow.
- **D4 - Review pronunciation attempts.** Review permits exactly two assessed
  pronunciation attempts. A first Wrong permits the second attempt. A second
  Wrong persists the Review result as Wrong and opens Recap immediately. Review
  has no Retry or Skip action.
- **D5 - Technical failures.** Microphone denial, invalid audio, Azure timeout,
  exhausted quota, throttling, or provider failure does not consume an attempt
  and does not persist a Wrong answer. Show a concise technical error and let
  the learner try again.
- **D6 - Practice library density.** On wide desktop, Practice Page Decks render
  ten cards per row. Page name and word count are centered both horizontally
  and vertically. Responsive tablet and mobile layouts reduce the column count
  as needed to preserve readable, non-overflowing content.
- **D7 - Answer feedback.** After any Practice or Review submission, show only
  `Correct` or `Wrong`; remove the current detailed answer explanation from the
  feedback state. Existing normalized typed-answer comparison remains in
  place.
- **D8 - Existing learning rules.** Non-pronunciation Practice answers must be
  correct before advancing unless the learner uses the already-supported
  skip/reveal path. Review answers receive one attempt and persist immediately.
  Existing review scheduling, Practice completion, and recap-setting behavior
  remain unchanged.
- **D9 - Recap presentation.** Redesign Practice and Review recap as a centered,
  rounded content panel rather than a flashcard. Show, in order: word and class
  with a speaker button, IPA pronunciation, Definition, Meaning, and Example.
  Italicize the field labels. Do not show Synonyms or Antonyms. Long text wraps
  inside the panel.
- **D10 - Date-only review state.** Migrate `word_review_states.next_review_date`
  and `word_review_states.last_reviewed_at` to PostgreSQL `date`, migrate domain
  and API contracts to date-only values, and preserve each existing stored
  calendar date during conversion. Review history timestamps remain timestamps;
  only the two requested review-state fields change.
- **D11 - Active tables stay.** Do not drop `word_review_histories` or
  `flashcard_cards`. Both tables have active product dependencies, so the
  user's conditional requirement to drop them only when unused is not met.

## Feature Boundary

In scope:

- Dense Practice Page Deck presentation.
- Practice and Review answer-state presentation and recap redesign.
- Backend-owned Azure Pronunciation Assessment integration with safe failure
  mapping, configuration, and tests.
- Practice/Review pronunciation attempt behavior defined above.
- Date-only migration for the two review-state fields, including DTOs, domain,
  persistence, tests, and documentation.
- Provider stubs/fixtures so automated tests never require paid Azure calls.

Out of scope:

- Prosody, fluency coaching, transcript display, phoneme-by-phoneme feedback,
  or storing learner audio.
- Changes to the SRS scheduling algorithm, daily Review selection, Practice
  completion persistence, or the review recap preference.
- Dropping or redesigning `word_review_histories` or `flashcard_cards`.
- Replacing Azure with an open-source scoring service in this story.
- Changes to the Flashcard viewer or Flashcards library card density.

## Approved Interaction Examples

Practice pronunciation:

```text
Attempt 1: AccuracyScore 64 -> Wrong, one attempt remains
Attempt 2: AccuracyScore 68 -> Wrong, show Retry and Skip
Retry -> a fresh two-attempt round starts
Skip -> current step completes as Wrong and Practice continues
```

Review pronunciation:

```text
Attempt 1: AccuracyScore 69 -> Wrong, one attempt remains
Attempt 2: AccuracyScore 70 -> Correct, persist Correct and follow recap setting

Attempt 1: AccuracyScore 45 -> Wrong
Attempt 2: AccuracyScore 61 -> persist Wrong and open Recap immediately
```

Provider failure:

```text
Attempt 1 submission -> Azure HTTP 429
Result -> show a technical retry message; attempt counter remains zero
```

## Approved Follow-Up - 2026-07-21

- **D12 - Shared Flashcards density.** The Flashcards Page Deck list now uses
  the same compact, centered, responsive 10/7/2/1 presentation as Practice.
  This follow-up supersedes only the original Flashcards-library-density
  exclusion; Flashcard viewer behavior and deck navigation remain unchanged.

## Superseded Storage Constraint - 2026-07-21

E32 D11 preserved `flashcard_cards` because the synchronization writer still
existed during that story. After the page-owned read workflow was proven, the
separately approved `US-DBCLN-001` retired that write-only projection in the
clean local baseline. E32's pronunciation and Review-history behavior remains
unchanged; `word_review_histories` stays active with a reduced result/timing
contract.

## Planning Questions

- Select the authenticated audio upload contract, accepted codec/size/duration,
  and backend timeout without broadening the public API surface.
- Select an Azure SDK or REST adapter isolated behind an application port so
  tests can use deterministic fake scores and failures.
- Define the `DateOnly` JSON shape and EF Core migration path while preserving
  existing calendar dates and query semantics.
- Reconcile the ten-column Practice-only grid with the shared Flashcards
  library component without changing Flashcards density.
- Define unit, integration, migration, browser, accessibility, and provider
  failure proof before implementation begins.

## Canonical References

- `docs/product/learning-workflows.md`
- `docs/product/flashcards.md`
- `docs/stories/epics/E17-learning-redesign/context.md`
- `docs/stories/epics/E29-flashcard-practice-library/context.md`
- Azure Pronunciation Assessment documentation:
  <https://learn.microsoft.com/azure/ai-services/speech-service/how-to-pronunciation-assessment>
