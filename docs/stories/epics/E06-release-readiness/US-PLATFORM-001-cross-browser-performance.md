# US-PLATFORM-001 Cross-Browser And Performance Proof

## Status

implemented

## Lane

normal

## Product Contract

`SPEC.md` Definition of Done requires the FluentA MVP to work correctly in
Chrome, Firefox, and Edge, and to satisfy release performance thresholds:
API response p95 below 300ms under normal load and First Contentful Paint below
2 seconds on simulated 4G.

## Relevant Product Docs

- `SPEC.md`
- `docs/stories/spec-coverage-map.md`

## Acceptance Criteria

- A cross-browser Playwright smoke proves the core learning loop in Chrome,
  Firefox, and Edge.
- A performance Playwright smoke measures authenticated API p95 for core reads
  and fails if it reaches 300ms or higher.
- A performance Playwright smoke measures login-page FCP on simulated 4G and
  fails if it reaches 2 seconds or higher.
- The SPEC coverage map distinguishes proven release checks from remaining
  environment-dependent gaps.

## Design Notes

- Commands: `npm run test:e2e:cross-browser`,
  `npm run test:e2e:performance`.
- UI surfaces: registration, login, vocabulary board, flashcard viewer.
- Platform rules: use installed Chrome and Edge channels when available;
  Firefox uses the Playwright-managed browser.

## Validation

When updating durable proof status, use numeric booleans:
`scripts/bin/harness-cli story update --id US-PLATFORM-001 --unit 0 --integration 0 --e2e 1 --platform 1`.

| Layer | Expected proof |
| --- | --- |
| Unit | Not applicable; this story verifies release checks. |
| Integration | API endpoint p95 smoke through the running backend. |
| E2E | Cross-browser core learning loop smoke. |
| Platform | Chrome, Firefox, Edge browser projects. |
| Release | API p95 and simulated-4G FCP thresholds. |

## Harness Delta

Adds a release-readiness matrix row for SPEC Definition of Done proof that is
not tied to one user story.

## Evidence

- `npx playwright install chrome firefox msedge`: system Chrome and Edge were
  present; Playwright Firefox 142.0.1 build v1495 installed.
- `npm run test:e2e:cross-browser`: passed 3 projects, Chrome, Firefox, and
  Edge. The smoke registered and verified a new user, logged in, created a
  vocabulary board/page/word through the UI, opened flashcards, and verified
  synchronized card rendering without relevant console errors.
- `npm run build`: passed with known third-party SignalR/Rolldown pure
  annotation warnings.
- `npm run test:e2e:performance`: passed 2 tests against production Vite
  preview on `http://127.0.0.1:4173`; authenticated API p95 stayed under
  300ms and simulated-4G FCP stayed under 2 seconds.
- `npm run lint`: passed.
- `npm run test:run`: passed 18 frontend tests.
