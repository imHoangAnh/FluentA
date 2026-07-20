# Design

## Domain Model

- `WordReviewState.NextReviewDate`: `DateOnly`.
- `WordReviewState.LastReviewedAt`: `DateOnly?`.
- Review transitions accept calculated local calendar dates; audit timestamps
  (`CreatedAt`, `UpdatedAt`, history `ReviewedAt`) remain UTC timestamps.
- Pronunciation score classification is an application rule with an approved
  threshold of 70, not a persisted domain entity.

## Application Flow

```text
authenticated wordId + validated WAV
  -> resolve active owned word + Board language
  -> map Board language to supported Azure locale
  -> provider returns AccuracyScore
  -> validate 0..100 and classify at 70
  -> return only correct boolean
```

Provider technical failures return a typed unavailable error. They never call
Review persistence and never change a frontend attempt counter.

## Interface Contract

```http
POST /api/v1/pronunciation/words/{wordId}/assessment
Authorization: Bearer <JWT>
Content-Type: audio/wav

<16-kHz 16-bit mono PCM WAV bytes>
```

Success:

```json
{ "data": { "correct": true }, "error": null }
```

Errors:

- `400 INVALID_PRONUNCIATION_AUDIO`: invalid WAV/format/size/duration.
- `404 PRONUNCIATION_WORD_NOT_FOUND`: foreign, deleted, or missing word.
- `503 PRONUNCIATION_UNAVAILABLE`: provider disabled, timeout, throttling,
  quota, cancellation, invalid provider response, or provider 5xx.

No client request field controls reference text, locale, score threshold,
provider endpoint, or Prosody.

## Data Model

Alter only:

- `word_review_states.next_review_date`: `timestamp with time zone` -> `date`.
- `word_review_states.last_reviewed_at`: `timestamp with time zone` -> nullable
  `date`.

The `Up` migration converts existing values with
`(value AT TIME ZONE 'Asia/Ho_Chi_Minh')::date`, proven against the four current
rows. The `Down` migration restores timezone-aware timestamps representing
midnight in `Asia/Ho_Chi_Minh` and is structurally reversible, but cannot
recover removed time-of-day precision.

## UI / Platform Impact

- Practice library wide desktop: ten columns; tablet: five; mobile: two;
  narrow mobile: one. Cards are compact, centered, rounded, and wrap names.
- Practice and Review share recap presentation but keep separate state
  machines.
- Recorder uses `getUserMedia`, produces a bounded mono WAV, auto-stops after
  five seconds, releases tracks on stop/unmount, and exposes accessible
  Start/Stop states.
- Correct/Wrong text accompanies semantic icons/colors; color is not the sole
  signal.

## Configuration

```text
AzureSpeech__Enabled=true
AzureSpeech__Region=southeastasia
AzureSpeech__SubscriptionKey=<secret>
AzureSpeech__TimeoutSeconds=10
AzureSpeech__AccuracyThreshold=70
```

The key is never committed or returned. Disabled/missing configuration produces
the generic 503 contract.

## Observability

- Log provider status category, duration, and request correlation only.
- Never log audio bytes, Azure key, reference word, transcript, or raw provider
  response.
- Existing canonical request logs remain the API audit boundary.

## Alternatives Considered

See `approach.md`. Browser transcript scoring, frontend Azure calls, Speech SDK,
browser WebM, direct UTC date casts, and table removal are rejected.
