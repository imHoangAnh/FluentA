# US-VOCAB-010 Overview

## Status

implemented

## Lane

normal

## Product Contract

Keep Vocabulary creation compact and predictable by opening Board and Page
forms in accessible modals, keeping the active Board's `Add page` action above
every Page, and extending the supported Word classes without changing the
existing Vocabulary endpoints or database schema.

## Relevant Product Docs

- `docs/product/vocabulary-board.md`
- `docs/stories/epics/E28-vocabulary-workspace-polish/context.md`

## Acceptance Criteria

- Every create-Board trigger opens a modal containing Board name and target
  language fields; the rail no longer renders an inline Board form.
- Every create-Page trigger opens a modal containing the Page name field; the
  workspace no longer renders an inline Page form.
- Cancel and Escape close either modal without calling a create endpoint, while
  a pending submit cannot be duplicated.
- The active Board renders `Add page` before its newest-first Page list, so the
  action stays at the top after any number of Pages are created.
- Vocabulary accepts, persists, and returns the additional Word classes
  `Collocation`, `PhrasalVerb`, `Idiom`, `Proverb`, `NounPhrase`, and
  `VerbPhrase`.
- Class selectors show readable labels `Collocation`, `Phrasal Verb`, `Idiom`,
  `Proverb`, `Noun Phrase`, and `Verb Phrase` while preserving the API's
  lowercase string convention.
- Existing Board/Page selection, newest-first ordering, create success toasts,
  word autosave, flashcard sync, review sync, and ownership behavior remains
  unchanged.

## Non-Goals

- New endpoints, schema migrations, Board/Page ordering controls, word-class
  free text, Search/Filter implementation, or redesign of the Vocabulary table.

## Verification

- Focused React component tests for modal behavior, create payloads, and
  `Add page` DOM order.
- Focused frontend tests for readable extended class options.
- Focused Vocabulary application tests for parsing and returning every new
  Word class.
- Frontend lint/build, backend build-through-tests, and `git diff --check`.
