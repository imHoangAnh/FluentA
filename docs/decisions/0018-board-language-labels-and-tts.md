# 0018 Board Language Labels And TTS

## Status

Accepted

## Context

SPEC.md US-011 requires board language to drive TTS voice selection and adaptive labels. The existing data model already stores a board language code and uses `meaningEn` as the secondary vocabulary/card field copied through flashcard sync.

Chinese support raised a product question: whether Pinyin should reuse the existing secondary field or become a new durable field.

## Decision

Chinese boards reuse the existing secondary field and display it as Pinyin. The durable API/storage name remains `meaningEn` in this slice.

Known board-language codes map to browser-friendly speech tags:

- `en` -> `en-US`
- `zh` -> `zh-CN`
- `ja` -> `ja-JP`
- `ko` -> `ko-KR`
- `fr` -> `fr-FR`

Unknown codes keep the default secondary label and use the raw code as the utterance language fallback.

`GET /api/v1/flashcards/decks` includes `boardLanguage` so the read-only flashcard viewer can apply the same label rules as review sessions.

## Consequences

- US-011 is completed without a migration.
- Existing vocabulary/card synchronization remains unchanged.
- A future dedicated Pinyin field can still be added as a separate product change if learners need both English definitions and Pinyin at the same time.
