# US-FLASH-005 Flashcard Viewer Content Refresh

## Status

implemented

## Lane

normal

## Product Contract

Refresh the read-only one-card Flashcard viewer so its front and back present
the approved vocabulary fields in a centered, responsive, bounded card while
preserving click-to-flip navigation and all Practice, Review, and SRS behavior.

## Approved Decisions

- **D1 - Read-only IPA contract.** Extend the existing page-session card
  response with required `ipaPronunciation`. This is an additive API change
  sourced from the existing Vocabulary word; it does not change the database.
- **D2 - Desktop footprint.** Center the Flashcard at about two thirds of the
  available content width on desktop.
- **D3 - Alignment and padding.** Center the front horizontally and vertically.
  Left-align the back content, center its content region vertically when it
  fits, and keep roughly 32px desktop or 20-24px mobile padding from the card
  border.
- **D4 - Back order and labels.** Render italic inline labels in this order:
  `Definition`, `Meaning`, `Example`, optional `Synonyms`, optional `Antonyms`.
  Definition maps to `meaningEn`; Meaning maps to `meaningVn`; Synonyms maps to
  `synonyms`; Antonyms maps to `antonyms`.
- **D5 - Bounded long content.** Wrap long text inside the card without
  horizontal overflow. Start Definition, Meaning, and Example near 16px and
  reduce them through approximately 14px to 12px for dense content. Start
  Synonyms and Antonyms near 12px and allow approximately 11px for dense
  content. Use internal vertical scrolling only when wrapped text still cannot
  fit at the minimum size. The card must not grow indefinitely.
- **D6 - Independent audio.** A keyboard-accessible speaker button reads the
  current word with the Board-language browser voice without flipping the
  card.
- **D7 - IPA presentation.** IPA is required and is always displayed with
  exactly one surrounding slash pair, whether or not the stored value already
  includes slashes.
- **D8 - Responsive dimensions.** Use an initial adjustable implementation:
  about 800x500 inside a 1200px desktop content region, about 600x400 inside a
  900px laptop region, and about 328x400 on a 360px mobile viewport. Do not
  force one aspect ratio at all breakpoints.

## Acceptance Criteria

- Front order is `Word (class)`, `/IPA/`, then the independent speaker action;
  the text is centered, approximately 18px, padded, and wraps inside the card.
- Back order and labels match D4. Required main content is approximately 16px;
  optional Synonyms and Antonyms are smaller and hidden when empty.
- Long or unbroken content cannot widen or escape the card. Density reduction
  happens before internal vertical scrolling.
- The card is a centered responsive rectangle matching D2/D8, with usable
  padding on desktop and mobile.
- Clicking the card or using its keyboard flip control still toggles front and
  back. Previous and Next still reset the next visible card to its front.
- The speaker supports pointer and keyboard activation, uses Board-language
  Web Speech, and does not flip the card.
- Final-card `Finish` and `Let's practice` behavior remains unchanged.
- `ipaPronunciation` is returned by the owned page-session API from the
  existing Vocabulary field with no schema or migration change.

## Recommended Path

1. Add `IpaPronunciation` to `FlashcardCardDto` and project the existing
   `VocabWord.IpaPronunciation` value in `EfFlashcardRepository`.
2. Add required `ipaPronunciation` to the frontend `FlashcardCard` contract.
3. Reshape only `FlashcardViewerPage` using existing Tailwind utilities,
   semantic design tokens, `Volume2`, and the existing Board-language speech
   helpers.
4. Use deterministic content-density classes plus wrapping and bounded
   vertical overflow so the first implementation remains easy for the user to
   tune later.
5. Reconcile product docs and focused backend/frontend/browser proof.

## Rejected Alternatives

- Fetch IPA through a second Vocabulary request: rejected because the owned
  page-session query already reads the source word and should return one
  coherent card shape.
- Change the database or copied Flashcard entity: rejected because IPA already
  exists on `VocabWord` and the current viewer reads live page words.
- Let the card grow with its content: rejected by D5 because the viewer should
  keep a stable rectangular footprint.
- Put the speaker inside the card's flip button: rejected because nested
  interactive controls are invalid and would couple audio activation to flip.
- Add route-specific legacy CSS: rejected by the accepted frontend design
  system boundary; the viewer should use the current utility/token surface.

## Integration Boundaries And Expected Files

- Backend DTO: `src/backend/FluentA.Application/BoundedContexts/Flashcards/DTOs/FlashcardDtos.cs`
- Backend projection: `src/backend/FluentA.Infrastructure/Flashcards/EfFlashcardRepository.cs`
- Frontend card type: `src/frontend/src/features/flashcards/api/flashcard.api.ts`
- Viewer UI: `src/frontend/src/features/flashcards/pages/FlashcardViewerPage.tsx`
- Focused unit/route proof: `src/backend/FluentA.Application.UnitTests/FlashcardServiceTests.cs`, `src/frontend/src/test/app/App.test.tsx`
- Browser proof: `src/frontend/e2e/flashcard-viewer.spec.js`
- Product contracts: `docs/product/flashcards.md`, `docs/product/learning-workflows.md`

## Risks And Required Proof

| Risk | Required proof |
| --- | --- |
| Positional DTO addition breaks projections or tests | Backend build and focused Flashcard tests |
| Long content escapes or makes the card unbounded | Focused long-content browser assertions at desktop and mobile widths |
| Speaker flips the card or is inaccessible | Pointer and keyboard browser/component assertions |
| IPA receives doubled/missing slashes | Unit/component cases for stored IPA with and without slashes |
| Viewer refresh regresses navigation | Existing click-to-flip, Previous/Next, Finish, and Practice-link proof |

## Non-Goals

- Practice or Review card redesign.
- Changes to scoring, SRS state, session persistence, routes, or navigation.
- Database schema or data migration.
- Automatic IPA generation or audio storage.
- Final pixel-perfect tuning beyond the approved adjustable first pass.

## Validation Shape

| Layer | Expected proof |
| --- | --- |
| Unit | Backend Flashcard contract/service tests and frontend viewer route tests |
| Integration | Infrastructure/API build proves the live word projection and additive DTO shape |
| E2E | Focused mocked or live Chromium viewer flow including long content and audio isolation |
| Platform | Frontend lint/build and backend build |
| Release | `git diff --check`, product-doc reconciliation, Harness trace |
