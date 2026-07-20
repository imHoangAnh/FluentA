# Exec Plan

## Goal

Ship E32 D1-D11 as one verified, deployable Practice/Review capability.

## Scope

In scope:

- Authenticated owned-word pronunciation assessment.
- Approved Practice/Review attempt and failure behavior.
- Dense Practice decks, simple feedback, and shared recap UI.
- Review-state `DateOnly` domain/API/schema migration.
- Tests, migration proof, product docs, decisions, and Harness evidence.

Out of scope:

- Prosody, stored audio, transcript, score display, SRS interval changes, or
  removal of active tables.

## Risk Classification

Risk flags:

- External paid provider and secret.
- Untrusted audio upload.
- Authenticated ownership boundary.
- Compatibility-sensitive schema and DTO migration.
- Existing learning state machines and responsive shared UI.

Hard gates:

- No source changes until validation approval.
- No real Azure call in automated tests.
- No migration completion claim without inspecting live column types and dates.
- No story closeout without mocked browser attempt/failure proof.

## Work Phases

1. Implement application pronunciation contract and deterministic tests.
2. Implement secure raw-WAV controller, owned-word lookup, Azure REST adapter,
   configuration, and fake HTTP proof.
3. Convert review-state domain/repository/DTOs and generate the EF migration.
4. Build shared recorder/recap UI and update Practice/Review state machines.
5. Apply Practice-only ten-column library layout.
6. Update product docs and decisions.
7. Run unit, integration, migration, browser, build, lint, audit, and diff proof.
8. Record validation evidence and Harness flags honestly.

## Stop Conditions

Pause for human confirmation if:

- Live data contains another timezone pattern before migration.
- Azure requires an undocumented audio/provider contract.
- The public API must expose a score/transcript or accept arbitrary text.
- Validation requires dropping or rewriting active history/card tables.
- Existing unrelated dirty changes overlap in a way that cannot be preserved.

