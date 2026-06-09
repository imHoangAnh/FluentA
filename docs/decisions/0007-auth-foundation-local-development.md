# 0007 Auth Foundation Local Development

Date: 2026-06-09

## Status

Accepted

## Context

`SPEC.md` defines a production-oriented authentication system with JWT access tokens, HttpOnly refresh cookies, Google OAuth, email verification, PostgreSQL, Redis, and AWS SES. The approved first implementation slice is narrower: real email/password auth with usable React UI, while Google OAuth and email verification remain local-development stubs.

The repository is greenfield and needs a first slice that can be built and verified locally without blocking on provider credentials or cloud infrastructure.

## Decision

Implement `US-AUTH-001` as a local-development auth foundation:

- Email/password registration, login, refresh, logout, and `/me` are real.
- Access tokens remain in frontend memory only.
- Refresh tokens use HttpOnly cookies and server-side revocation.
- Google OAuth and email verification are configuration-ready local-development stubs.
- Local persistence or token-store substitutes are allowed only for this story if they preserve the public API contract and keep a clear path to PostgreSQL/Redis later.

## Alternatives Considered

1. Implement production Google OAuth and email delivery in the first slice. Rejected because provider behavior is high-risk and not needed to prove local core auth.
2. Build backend auth only. Rejected because the approved first slice requires usable React UI and end-to-end proof.
3. Wait for full PostgreSQL and Redis integration before auth proof. Rejected because it would delay the first working product slice; compatibility can be preserved through contract boundaries.

## Consequences

Positive:

- The first product slice is locally testable.
- Deferred provider work is explicit and isolated.
- Later stories can replace stubs without changing the accepted endpoint names.

Tradeoffs:

- This story does not prove production OAuth, email delivery, Redis, or PostgreSQL behavior.
- Validation must avoid overstating production readiness.

## Follow-Up

- Add a dedicated production Google OAuth story after `US-AUTH-001`.
- Add a dedicated production email verification story after `US-AUTH-001`.
- Replace local persistence/token-store substitutes with production infrastructure when the data/storage story is accepted.
