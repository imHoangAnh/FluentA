# Feature 14 Context - Learning Redesign

## Feature Summary

Feature 14 replaces FluentA's mixed flashcard/review surface with three
separate learning workflows: read-only `Flashcard`, first-learning
`Practice`, and SRS `Review`.

## Approved Product Decisions

- **D1:** Navigation exposes separate `Flashcard`, `Practice`, and `Review`
  menu items, and the first-learning flow is named `Practice`.
- **D2:** All Words decks are removed. Each vocabulary page syncs to exactly
  one page deck.
- **D3:** Existing All Words SRS history does not need to be preserved.
  Destructive migration is acceptable.
- **D4:** Review state moves into a dedicated table linked to `VocabWord`.
- **D5:** Review state is created only after a full Practice session completes
  for a word.
- **D6:** Re-practice resets an existing review record to `Learning`, due
  tomorrow.
- **D7:** Deleting a word, page, or board hard-deletes related review-state
  records.
- **D8:** Practice selection is Board -> Page Deck. Practice includes every
  word in the selected page deck.
- **D9:** Practice supports `Sequential` and `Shuffle`; Sequential follows
  current deck/card creation order.
- **D10:** Practice uses a global unique mode sequence with a default of
  Dictation -> Meaning -> Word -> Pronunciation.
- **D11:** Each Practice word must complete the configured mode sequence, then
  a Flashcard recap, before moving on.
- **D12:** Wrong Practice answers stay on the current step until correct or
  skip/reveal. Skip/reveal completes the current step.
- **D13:** Practice persists review-state changes only when the full session
  finishes; abandoning a session saves nothing.
- **D14:** Review starts from a selected vocabulary board and reviews `word`
  units, not flashcard cards.
- **D15:** Review queue contains due-today and overdue words only.
- **D16:** Review has a global daily limit with a default of `300 words/day`.
- **D17:** If due words exceed the limit, Review selects the oldest due words
  first and moves overflow due dates to tomorrow at session start.
- **D18:** Review supports `Sequential` and `Shuffle` word order plus
  Dictation, Pronunciation, Meaning -> Word, or Random mode per session.
- **D19:** Review scoring is automatic correct/wrong; correct maps to SM-2
  `Good`, wrong maps to `Again`.
- **D20:** Review persists each answered word immediately.
- **D21:** Flashcard becomes a read-only one-card viewer for page decks, with
  final actions `Finish` and `Let's practice`.

## Existing Repo Reality

- `FlashcardsPage.tsx` still mixes dashboard, inline deck cards, review, and
  practice actions.
- `PracticeSessionPage.tsx` implements Feature 13 practice interactions as a
  practice-only summary flow that never affects SRS.
- `ReviewSessionPage.tsx` still owns Page Deck active recall and All Words SM-2
  review.
- `flashcard.api.ts` and backend flashcard services still expose All Words
  deck types, flashcard settings, review sessions, and practice summaries under
  `/api/v1/flashcards/*`.
- The dashboard and home page still depend on All Words deck availability and
  current flashcard dashboard metrics.

## Canonical References

- `SPEC.md` Section 14
- `docs/product/learning-workflows.md`
- `docs/decisions/0034-learning-workflow-redesign-boundary.md`

## Deferred Planning Questions

- Choose final endpoint and DTO boundaries for `flashcards`, `practice`, and
  `review`.
- Choose whether review-state queries denormalize board scope or join through
  vocabulary ownership paths.
- Decide whether dashboard metrics move under Review or are intentionally
  removed in this slice.
