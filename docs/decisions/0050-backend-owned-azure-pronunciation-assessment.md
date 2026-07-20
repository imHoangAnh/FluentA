# 0050 Backend-Owned Azure Pronunciation Assessment

Date: 2026-07-20

## Status

Accepted

## Context

Practice and Review currently compare browser-recognized transcript text with
the expected word. The user approved actual pronunciation scoring through
Azure Speech, a threshold of 70, two-attempt workflow rules, no transcript or
numeric score, and no Prosody charge. The provider key and reference word must
not become client-controlled data.

## Decision

FluentA will expose an authenticated owned-word pronunciation endpoint that
accepts a bounded 16-kHz PCM WAV body. The backend resolves the reference word
and locale, calls Azure's short-audio REST assessment with Basic HundredMark
scoring, classifies `AccuracyScore >= 70`, and returns only a boolean.

Audio remains transient. Azure credentials come only from runtime
configuration. Provider, quota, timeout, and malformed-response failures are
retriable technical failures and never consume a Practice or Review attempt.

## Alternatives Considered

1. Browser SpeechRecognition transcript matching. Rejected because it measures
   recognition and exposes the script.
2. Direct browser-to-Azure calls. Rejected because the key, reference text, and
   cost boundary would be client controlled.
3. Microsoft Speech SDK. Rejected because short-audio REST already covers the
   bounded single-word WAV case without a native SDK dependency.
4. Self-hosted open-source scoring. Deferred because the user selected Azure.

## Consequences

Positive:

- Pronunciation correctness comes from a provider designed for assessment.
- Secrets, target text, threshold, and provider errors stay server-side.
- Tests can replace the provider port without paid calls.

Tradeoffs:

- Production requires Azure configuration, network availability, quota, and
  usage cost.
- The browser must generate the narrow WAV contract.
- Live provider behavior requires a credentialed operator smoke test.

## Follow-Up

- Implement and prove `US-PR-001`.
- Document environment variables and operational smoke steps.

