# E32 Practice And Review Session Redesign Approach

## Recommended Path

Deliver the approved E32 behavior as one high-risk vertical story,
`US-PR-001`, because the visible attempt rules depend on one authenticated
assessment contract and the date-only migration changes the same Review flow's
public result contract.

### Pronunciation boundary

1. Add an authenticated endpoint:
   `POST /api/v1/pronunciation/words/{wordId}/assessment`.
2. Accept only a raw `audio/wav` body containing 16-kHz, 16-bit, mono PCM.
   The browser records at most five seconds; the API independently rejects
   malformed, empty, oversized, or longer-than-ten-second WAV input.
3. Resolve the target word and Board language from PostgreSQL under the
   authenticated user's ownership. Do not accept target text, locale, Azure
   endpoint, or score threshold from the client.
4. Call Azure's short-audio Speech REST endpoint through an application port
   and infrastructure `HttpClient` adapter. Send a Basic, HundredMark,
   FullText scripted assessment with Prosody disabled.
5. Keep the numeric score inside the backend. The API returns only
   `{ "correct": true|false }`; score 70 or greater is correct.
6. Map microphone/codec errors to client validation and Azure timeout,
   throttling, quota, cancellation, malformed response, or disabled provider to
   a generic retriable unavailable result. No provider failure consumes a
   learner attempt.

### Frontend interaction

- Replace Web Speech transcript state in Practice and Review with a shared,
  focused WAV recorder and one pronunciation API adapter.
- Practice owns two-attempt rounds and exposes Retry/Skip only after the second
  Wrong result.
- Review owns two total attempts and persists Wrong immediately after the
  second failure.
- Reuse one presentational recap component in Practice and Review while keeping
  workflow navigation and persistence in their current page containers.
- Give the shared Page Deck library a Practice-only dense grid: ten columns on
  wide desktop, five on tablet, two on mobile, and one only where content would
  otherwise overflow. Flashcards retains its existing density.

### Date-only review state

- Change only `WordReviewState.NextReviewDate` and `LastReviewedAt` to
  `DateOnly`/`DateOnly?` and map them to PostgreSQL `date`.
- Replace timestamp window predicates with calendar comparisons (`<`, `==`,
  `<=`) against the learner's local `DateOnly` derived from each request's
  timezone.
- Keep `WordReviewHistory.ReviewedAt` and history `NextReviewDate` timestamp
  columns unchanged. When adding history, convert the newly calculated date to
  a UTC-midnight timestamp only for the legacy history field.
- Backfill the four current live review-state rows through
  `timezone('Asia/Ho_Chi_Minh', column)::date`. Live inspection proved all four
  rows are `2026-07-20 17:00Z`, representing `2026-07-21` in the user's
  timezone; a direct UTC cast would corrupt them by one day.

## Rejected Alternatives

1. **Continue browser SpeechRecognition.** Rejected because transcript equality
   checks recognition, not pronunciation quality, and exposes the script the
   user asked to remove.
2. **Call Azure directly from React.** Rejected because it exposes the Azure
   key, trusts client-selected reference text, and removes owner/cost controls.
3. **Use the Microsoft Speech SDK package.** Rejected for this short single-word
   flow because the official short-audio REST contract already accepts WAV and
   avoids a large native SDK dependency.
4. **Send browser WebM/Opus.** Rejected because Azure's documented short-audio
   REST formats are WAV PCM and OGG Opus; browser WebM support would require an
   additional server codec runtime.
5. **Cast review timestamps directly with `::date`.** Rejected because live
   data proves it would move the four current due dates from July 21 to July 20.
6. **Drop `word_review_histories` or `flashcard_cards`.** Rejected because both
   are active read/write dependencies.

## Trust Boundaries And Abuse Cases

| Boundary | Threat | Control and required proof |
| --- | --- | --- |
| Browser -> API WAV | oversized/malformed upload, cost abuse | JWT, owned `wordId`, raw-body limit, RIFF/PCM parser, duration cap, no client reference text |
| API -> Azure | secret disclosure, SSRF, runaway request | region-only host construction, secret from configuration, HTTPS, timeout, no audio/key logging |
| Azure -> API JSON | malformed or missing score | bounded JSON parsing, score range validation, generic unavailable error |
| Date migration | due-date corruption | explicit Vietnam timezone conversion and before/after SQL proof |
| UI state | provider failure counted as Wrong | deterministic fake-provider tests for timeout/429/invalid response and attempt counters |

Audio is transient request data. It is neither persisted nor added to logs,
review history, analytics, or provider-response DTOs.

## Expected Integration Boundaries

Backend:

- New application Pronunciation service, DTOs, word lookup port, provider port,
  typed errors, and unit tests.
- New infrastructure EF word lookup and Azure Speech REST adapter.
- New authorized controller and DI/configuration wiring.
- Review domain/DTO/repository `DateOnly` changes and one EF migration.

Frontend:

- New pronunciation API adapter and recording hook/utility.
- Practice and Review session state changes.
- Shared recap presentation component.
- Practice-only deck-grid density changes.
- Vitest and Playwright fixtures that return deterministic assessment results.

Tracked contracts:

- `docs/product/learning-workflows.md`
- `docs/product/flashcards.md` only where the shared library boundary needs
  clarification; the Flashcard viewer itself is unchanged.
- Decisions `0050` and `0051`.

## Required Proof

- Domain tests for date-only review transitions.
- Application tests for ownership, WAV validation, threshold 69/70, provider
  failure mapping, and updated review scheduling.
- Infrastructure adapter tests using a fake HTTP handler; no paid Azure call.
- Migration SQL proof on the live local PostgreSQL rows.
- Vitest for WAV generation/recap/deck density where practical.
- Mocked-API Chromium proof for Practice Retry/Skip, Review two-attempt
  persistence, provider failure not consuming attempts, feedback text, recap,
  and responsive ten-column layout.
- Backend builds/tests, frontend lint/tests/build, dependency audit, and diff
  check.

