# Learning Workflows

## Product Boundary

FluentA's learning surface is split into three top-level workflows:
`Flashcard`, `Practice`, and `Review`. This contract defines the approved
target behavior for that split and the data ownership rules that support it.

## Navigation Split

- The protected learning navigation exposes separate `Flashcard`, `Practice`,
  and `Review` menu items.
- The first-learning workflow is named `Practice`.
- The product language for SRS work uses `word`, not `card`.

## Flashcard

- Flashcard is a read-only page-deck viewer.
- The initial Flashcard view shows only page decks grouped by vocabulary board
  and page. It does not list every word inline.
- Selecting a page deck opens a one-card-at-a-time viewer.
- Learners flip the current card by clicking it and move with manual
  Next/Previous controls.
- The final card offers `Finish` and `Let's practice`. `Let's practice`
  redirects to Practice for that exact page deck.
- Card front shows `word`, `class`, and optional `meaningEn`.
- Card back shows `meaningVn`, `example`, and optional `thesaurus`.
- Empty optional fields are hidden.

## Practice

- Practice runs on one selected page deck chosen from a Board -> Page Deck
  selection flow.
- Practice includes every word in the selected page deck, including words that
  already have review state.
- Practice supports `Sequential` and `Shuffle` word order.
- Sequential follows current deck/card creation order.
- Shuffle randomizes within that selected deck.
- Practice uses a global user setting for the mode sequence.
- The mode sequence must contain at least one unique mode from Dictation,
  Meaning -> Word, and Pronunciation.
- The default mode sequence is Dictation -> Meaning -> Word -> Pronunciation.
- Each word must complete the configured mode sequence, then a Flashcard recap,
  before moving to the next word.
- The recap is always last, cannot be disabled, and cannot be reordered.
- Wrong answers stay on the current step until the learner answers correctly
  or uses skip/reveal.
- Skip/reveal completes the current step.
- Practice tracks completion in the UI during the session, but the backend
  creates or resets review state only after the full page-deck session
  finishes.
- Leaving Practice before the session finishes persists no review-state
  changes.

## Review

- Review is the only SRS workflow.
- Review starts from one selected vocabulary board, not from a flashcard deck.
- Review builds a due-word queue from that board's vocabulary pages.
- Only words due today or overdue enter the queue.
- Review supports `Sequential` and `Shuffle` queue order.
- Sequential sorts by oldest `nextReviewDate` first, then creation order.
- Shuffle first selects the oldest-due limited set, then shuffles within it.
- Review asks the learner to choose one mode per session: Dictation,
  Pronunciation, Meaning -> Word, or Random.
- Random keeps the chosen word order and randomizes only the mode assigned to
  each word.
- Review uses automatic correct/wrong results. It does not show
  Easy/Good/Hard/Again buttons.
- Correct maps to SM-2 `Good`; wrong maps to SM-2 `Again`.
- Review persists each answered word immediately.
- Wrong answers show answer/recap and move to the next word.
- Correct-answer recap follows the global review `recap after answer` setting.

## Review Limits And Settings

- Review has a global daily limit setting with a default of `300 words/day`.
- When due words exceed the daily limit, Review selects the oldest due words
  first and moves the overflow due dates to tomorrow when the session starts.
- Review has a separate global `recap after answer` setting.
- Practice settings and Review settings are separate, but FluentA edits them
  together from the unified authenticated `/settings` page.

## Learning Data Ownership

- All Words decks are removed from the product model.
- Each vocabulary page synchronizes to exactly one page deck.
- Review state is stored in a dedicated table linked to `VocabWord`.
- New vocabulary words do not create review state automatically.
- Completing Practice for a word creates review state as `Learning`, due
  tomorrow.
- Re-practicing a word resets its existing review state to `Learning`, due
  tomorrow.
- Deleting a word, page, or board hard-deletes related review-state records.
- Destructive migration from the old All Words review model is acceptable for
  this redesign.

## Scope Boundaries

- Preserving old All Words review history is out of scope.
- Improving the SRS algorithm beyond correct = Good and wrong = Again is out
  of scope for this MVP.
- Practice does not persist partial progress for abandoned sessions.
- Practice mode overrides per session are out of scope; Practice mode sequence
  is global.
- Review remains board-level and is not page-deck scoped.
