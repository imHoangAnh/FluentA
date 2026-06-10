# Overview

## Current Behavior

Boards store a language code and review sessions pass it to a basic TTS call, but vocabulary and flashcard labels still hard-code "English" for the secondary field.

## Target Behavior

Board language drives the secondary vocabulary/card label and browser TTS language. Chinese boards display the existing secondary field as Pinyin, and review TTS asks the browser for a matching Chinese voice when one exists.

## Affected Users

- Authenticated learners using non-English boards, especially Chinese vocabulary boards.

## Affected Product Docs

- `docs/product/vocabulary-board.md`
- `docs/product/flashcards.md`

## Non-Goals

- Add a dedicated Pinyin database field.
- Translate the full application UI.
- Add external speech providers.
