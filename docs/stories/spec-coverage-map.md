# SPEC.md MVP Coverage Map

Date: 2026-06-10

This map reconciles `SPEC.md` user stories US-001 through US-019 with the
current Harness story matrix. Status values:

- `Done`: implemented and covered by Harness evidence.
- `Partial`: behavior exists but SPEC contract is not fully satisfied.
- `Decision`: accepted product decision intentionally differs from SPEC.

| SPEC Story | SPEC Scope | Current Status | Harness Evidence |
| --- | --- | --- | --- |
| US-001 | Email registration, verification email | Done | `US-AUTH-001` plus `US-AUTH-003` implement registration, duplicate email, validation, local verification token/link, and verification proof. |
| US-002 | Google OAuth login | Done | `US-AUTH-002` covers server-side Google OAuth flow, durable users, and provider/config errors. |
| US-003 | Email/password login | Done | `US-AUTH-001` plus `US-AUTH-003` cover credential login and `EMAIL_NOT_VERIFIED` rejection. |
| US-004 | Token refresh/logout/current user | Done | `US-AUTH-001` and `US-AUTH-002` cover in-memory access token, HttpOnly refresh cookie, Redis refresh rotation, `/me`, logout, and stale-token rejection. |
| US-005 | Board management | Done | `US-VOCAB-001`. |
| US-006 | Page management | Done | `US-VOCAB-001`. |
| US-007 | Inline vocabulary entry | Done | `US-VOCAB-002` plus `US-VOCAB-004`. |
| US-008 | Edit word | Done | `US-VOCAB-002` plus `US-VOCAB-004`. |
| US-009 | Delete word | Done | `US-VOCAB-002` and `US-FLASH-001`. |
| US-010 | Column customization | Done | `US-VOCAB-003`. |
| US-011 | Multi-language support | Done | `US-VOCAB-005`. |
| US-012 | Deck list page | Done | `US-FLASH-003`. |
| US-013 | Auto card sync | Done | `US-FLASH-001` and `US-FLASH-002`. |
| US-014 | Read-only card viewer | Done | `US-FLASH-003`. |
| US-015 | Page Deck active recall | Done | `US-REVIEW-001`. |
| US-016 | All Words SM-2 review | Done | `US-REVIEW-002` and `US-REVIEW-003`. |
| US-017 | Study mode selection | Done | `US-REVIEW-001`, `US-REVIEW-002`, and `US-REVIEW-003`. |
| US-018 | Flash Card Dashboard | Done | `US-FLASH-004`. |
| US-019 | Session summary screen | Done | `US-REVIEW-001`, `US-REVIEW-002`, and `US-REVIEW-003` cover immediate in-session summaries; `POST /api/v1/flashcards/sessions` and `GET /api/v1/flashcards/sessions/{sessionId}/summary` provide the SPEC session API contract. |

## Remaining MVP Gap

No remaining SPEC.md MVP user-story feature gap is known after
`US-REVIEW-004`.

## Remaining Full-SPEC Verification Gap

The feature stories are implemented, but a stricter requirement-by-requirement
release audit still has one item that is not yet proven by current evidence:

- `SPEC.md` says registration sends a verification email via AWS SES. Current
  implementation includes configurable AWS SES delivery, but live SES sending
  is not verified in this local environment because it requires AWS
  credentials and a verified SES sender identity.

## Release Proof Added

- Chrome, Firefox, and Edge proof exists through
  `npm run test:e2e:cross-browser`, which exercises registration, email
  verification, login, vocabulary board/page/word creation, and synchronized
  flashcard rendering in all three browsers.
- Performance threshold proof exists through
  `npm run test:e2e:performance`, run against a production Vite preview build:
  authenticated `/api/v1/auth/me` p95 stayed below 300ms, and login-page FCP
  stayed below 2 seconds under simulated 4G.
- Backend quality proof exists through
  `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-backend-quality.ps1`:
  Domain logic line coverage is 87.99%, Application logic line coverage is
  77.97%, and XML summaries are enforced for public controller action methods
  and application service contract methods.

## Accepted Differences

- Chinese Pinyin reuses the existing secondary meaning field, captured in
  decision `0018-board-language-labels-and-tts`.
