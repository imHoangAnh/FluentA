# Design

## Release-Proof Coverage

The release-proof ladder should cover the epic release gate directly:

| Release gate | Proof surface |
| --- | --- |
| No legacy mixed controller routes remain | static controller scan plus direct request failures for removed routes when practical |
| No frontend/test clients depend on removed mixed endpoints | static scan over frontend source and focused specs |
| Practice uses Review only through the Review enrollment port | code-path scan plus prior application proof |
| Review is the only owner of SRS state/history/settings/dashboard | repository and controller ownership scan plus focused runtime Review flows |
| Vocabulary still syncs cards and cleans Review progress correctly | focused backend proof plus live create/update/delete smoke |
| EF mappings use owned schemas | migration/configuration scan and runtime schema inspection |

## Selected Ladder

1. Static scans for removed endpoints and ownership boundaries.
2. Backend compile and focused test confirmation for the split.
3. Frontend lint, Vitest, and build.
4. Focused Playwright coverage for:
   - Flashcard viewer
   - Practice workflow
   - Add to Review
   - Review workflow
   - dashboard/stats
   - unified settings
5. Live API/PostgreSQL smoke for Vocabulary create/update/delete sync cleanup
   and schema ownership.

## Constraints

Do not:

- call the epic releasable if only static proof passes while runtime proof is
  still red
- blur stale historical test drift into “release pass” without documenting it
- reintroduce removed `/api/v1/flashcards/*` Practice/Review endpoint families
- claim schema ownership unless runtime and configuration evidence match
