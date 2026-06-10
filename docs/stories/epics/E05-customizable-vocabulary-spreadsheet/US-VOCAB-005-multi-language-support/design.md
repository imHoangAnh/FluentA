# Design

## Domain Model

No schema change. `VocabBoard.Language` remains the canonical language code.

## Application Flow

Vocabulary, deck-list, and review-session reads include enough board language context for frontend presentation. The frontend maps known language codes to semantic labels and speech tags.

## Interface Contract

`GET /api/v1/flashcards/decks` includes `boardLanguage` on each deck.

Known frontend language profile mappings:

- `en` -> English meaning, `en-US`
- `zh` -> Pinyin, `zh-CN`
- `ja` -> English meaning, `ja-JP`
- `ko` -> English meaning, `ko-KR`
- `fr` -> English meaning, `fr-FR`

Unknown codes keep English meaning labels and use the raw language code for TTS.

## Data Model

No migration.

## UI / Platform Impact

Vocabulary spreadsheet labels, blank-row labels, flashcard viewer labels, and review answer labels adapt from board language. Review TTS selects an exact browser voice match first, then a base-language match, then falls back to utterance language only.

## Observability

No new logs or audit records.

## Alternatives Considered

1. Add a dedicated Pinyin field. Deferred because the existing secondary field can satisfy SPEC.md US-011, while custom columns already allow optional extra fields.
