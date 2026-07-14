# US-NOTE-006 Vocabulary-Aligned Notes Layout

## Status

implemented

## Lane

normal

## Product Contract

Notes uses the Vocabulary board/page rail layout. The selected note title is
followed by its date and then the rich-text editor; the former word and
character counters are removed.

## Validation

- Focused Notes Vitest checks retain editor/save behavior and assert the date
  and counter-free editor header.
- Frontend lint, production build, and `git diff --check` run after the layout
  change.
