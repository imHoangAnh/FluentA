# US-FLASH-005 Validation

## Status

READY WITH CONSTRAINTS on 2026-07-20.

## Reality Gate

| Assumption | Risk | Evidence | Result |
| --- | --- | --- | --- |
| IPA already exists on the source Vocabulary word | A schema change would broaden the story | `VocabWord.IpaPronunciation` is required and `VocabularyService.ValidateWord` rejects empty IPA with a 2000-character limit | Ready |
| Page-session projection can add IPA without changing route or ownership | Positional DTO/projection breakage | `EfFlashcardRepository` already projects live `VocabWord` fields for both board listing and `GetPageSessionAsync`; API build passes before the addition | Ready |
| Existing Board-language Web Speech helpers can serve the viewer | Incorrect language or duplicated unsupported behavior | Practice already uses `getLanguageProfile`, `selectSpeechVoice`, `SpeechSynthesisUtterance`, cancel, and speak against `boardLanguage` | Ready |
| Current design system can express the responsive card without legacy CSS | Styling could conflict with the shared shell | Viewer already uses Tailwind utilities and semantic tokens; focused ESLint passes and decision 0046 requires this boundary | Ready |
| Focused tests can observe the approved exit state | Story could be marked ready without real proof | App Vitest fixture owns the viewer route; mocked Playwright route interception can provide long content and stub browser speech | Ready |

## Planned Baseline Proof

- `dotnet test src/backend/FluentA.Application.UnitTests/FluentA.Application.UnitTests.csproj --no-restore`
- `dotnet build src/backend/FluentA.API/FluentA.API.csproj --no-restore`
- `npm --prefix src/frontend run test:run -- src/test/app/App.test.tsx`
- `npm --prefix src/frontend run build`
- `git diff --check`

## Baseline Evidence

- `dotnet test src/backend/FluentA.Application.UnitTests/FluentA.Application.UnitTests.csproj --no-restore`
  passed 115/115.
- `dotnet build src/backend/FluentA.API/FluentA.API.csproj --no-restore`
  passed with one pre-existing `NU1903` warning for `Microsoft.OpenApi` 2.0.0.
- `npm --prefix src/frontend run test:run -- src/test/app/App.test.tsx`
  passed 11/11.
- Focused ESLint for the current Flashcard viewer and API files passed.
- `npm --prefix src/frontend run build` is currently blocked by unrelated
  worktree changes: unused `Link` and `Button` imports in
  `ReviewSessionPage.tsx`, plus unused `formatDay` in `TodoPage.tsx`.
- `git diff --check` currently reports unrelated trailing whitespace at
  `TodoPage.tsx:135`; the story must not repair or claim this user-owned change.

## Constraints

- Preserve the user's unrelated Review, Todo, navigation, and
  `design-system.css` worktree changes.
- Do not claim live speech audio output in an automated runner; verify the
  browser API invocation, language selection, independent click behavior, and
  accessible control instead.
- Do not require a live database for the additive DTO/build gate unless the
  current runtime is already available.
- The final full frontend build and repository-wide diff check may remain
  blocked by the named pre-existing Review/Todo changes. Story-owned focused
  lint, tests, TypeScript/build evidence, and diff inspection must be reported
  separately rather than editing those files.

## Feasibility Result

**READY WITH CONSTRAINTS.** `US-FLASH-005` is the smallest coherent slice and
can be implemented without schema, route, Practice, Review, or SRS changes.
The authorized source boundary is the additive Flashcard DTO/projection,
frontend card contract, viewer presentation, focused tests, and reconciled
Flashcard product/story docs. The unrelated frontend build and whitespace
failures are baseline constraints, not permission to edit the affected files.

## Implementation Review

**IMPLEMENTED AND REVIEWED on 2026-07-20.** The viewer now renders the approved
front and back fields in a centered, bounded responsive card. IPA is supplied
by the existing Vocabulary projection, speech remains an independent control,
and long content wraps, reduces density, then scrolls vertically inside the
card. No schema, route, Practice, Review, or SRS behavior changed.

## Acceptance Evidence

| Acceptance area | Evidence | Result |
| --- | --- | --- |
| Front content and IPA normalization | App route proof checks `word (class)`, stored IPA without slashes rendered with exactly one slash pair, and the speaker after it | Pass |
| Back labels, order, optional rows | App route proof checks Definition, Meaning, Example, Synonyms, and Antonyms; Chromium checks their DOM order | Pass |
| Responsive bounded dimensions | Chromium checks about 800x500 at 1440px and full available content width with 400px height at 360px | Pass |
| Long-content fallback | Chromium supplies long and unbroken content, observes dense typography, no horizontal overflow, and an internally scrollable back region | Pass |
| Independent accessible audio | Component and Chromium proof check Board-language `zh-CN` speech, pointer and Enter activation, and no card flip | Pass |
| Existing viewer behavior | Component proof preserves final `Let's practice`; focused viewer flow preserves flip semantics and existing controls | Pass |
| Additive backend contract | Repository projections expose required IPA from the existing source word; backend solution tests and Release API build pass | Pass |

## Final Commands And Results

- `dotnet test src/backend/FluentA.slnx -c Release --no-restore`: passed 40
  Domain tests and 115 Application tests.
- `dotnet build src/backend/FluentA.API/FluentA.API.csproj -c Release --no-restore`:
  passed with the existing `NU1903` warning for `Microsoft.OpenApi` 2.0.0.
- `npm --prefix src/frontend run test:run -- src/test/app/App.test.tsx`:
  passed 11/11 and is also the Harness story verify command.
- Full frontend Vitest run: passed 17 files and 63/63 tests. Earlier
  Workspace/Notes timeout noise was not reproducible when the affected file
  ran alone, and the final full rerun passed.
- Focused ESLint for all story-owned frontend source and test files: passed.
- `tsc -p tsconfig.app.json --noUnusedLocals false --noUnusedParameters false`
  followed by `vite build`: passed; 2,077 modules were bundled. Existing
  SignalR/Rolldown pure-annotation warnings remain non-blocking.
- `playwright test e2e/flashcard-viewer-refresh.spec.js`: passed 1/1 in
  Chromium, covering desktop, mobile, long content, audio isolation, and
  keyboard interaction.
- Story-owned `git diff --check`: passed with line-ending conversion warnings
  only.
- `harness-cli story verify US-FLASH-005`: passed.

## Review Constraints And Attribution

- The canonical `npm --prefix src/frontend run build` still reports only the
  pre-existing unused imports in `ReviewSessionPage.tsx` and unused
  `formatDay` in `TodoPage.tsx`. The scoped typecheck and production Vite
  bundle prove the story-owned frontend path without modifying those files.
- Repository-wide `git diff --check` remains blocked only by the pre-existing
  trailing whitespace in `TodoPage.tsx:135`; the story-owned path check passes.
- The already-running local API process holds Debug output DLLs and predates
  this implementation, so it was preserved rather than restarted. Release
  compilation plus mocked Chromium integration proof cover this story; the
  existing live API viewer spec was not rerun against that stale process.

## Corrective Runtime Follow-Up — 2026-07-20

The user reported that
`/flashcards/pages/5f275f3c-3f12-4e79-984b-bc36358e325c` displayed
`Load failed this page.` and then required another login. The two causes were
reproduced and repaired:

1. The Vite frontend had hot-reloaded the required IPA rendering while the
   API still served Debug assemblies built on 2026-07-17. Those responses
   omitted `ipaPronunciation`, so `formatIpa` called `trim()` on `undefined`
   and the route error boundary replaced the viewer.
2. The browser origin was `localhost:5173`, but local `.env.local` configured
   the API as `127.0.0.1:5000`. Because the refresh cookie is `SameSite=Strict`,
   a full navigation could not reliably refresh the in-memory access token
   across those different hosts and ProtectedRoute redirected to login.

### Corrective Changes

- Renamed the stale page-session response fields from `thesaurus` and
  `collocation` to their actual Vocabulary names, `synonyms` and `antonyms`,
  across the backend DTO/projection, frontend type/viewer, tests, and product
  docs. No database change was required.
- Made IPA formatting tolerate a temporarily stale response and show a clear
  inline unavailable message instead of throwing out of the protected route.
- Aligned the HTTP and Flashcard SignalR fallback URL with the documented
  `http://localhost:5000/api/v1` origin and changed the local runtime override
  from `127.0.0.1` to `localhost`.
- Rebuilt and restarted the local Debug API and Vite processes. The API now
  serves the Debug Application assembly built at 2026-07-20 15:55 local time.

### Corrective Proof

- Direct PostgreSQL read for the reported page id: page active, Board active,
  one active word, and zero active words missing IPA.
- Backend Application tests: passed 115/115.
- App plus HTTP-client Vitest: passed 18/18, including a stale-response case
  that proves missing IPA no longer produces `Load failed this page.`
- Focused ESLint and scoped TypeScript checking: passed.
- Debug API build: passed with the existing `Microsoft.OpenApi` 2.0.0
  `NU1903` warning only; restarted API OpenAPI probe returned HTTP 200.
- Live and mocked Chromium Flashcard flows: passed 2/2. Live proof covered
  registration, email verification, login persistence after full navigation,
  owner scoping, card creation/update, required IPA, exact
  `synonyms`/`antonyms` response names, viewer flip, and Finish navigation.
- Harness story verification: passed 12/12 App tests.
