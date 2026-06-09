# 0008 Auth Uses PostgreSQL, Redis, And Server-Side Google OAuth Locally

Date: 2026-06-09

## Status

Accepted

## Context

The first auth foundation proved the UI and API contract with in-memory stores,
but the product now needs local durable users, refresh session behavior that can
survive process restarts, and real Google login without exposing the Google
client secret to the browser.

## Decision

Local development will run PostgreSQL and Redis through Docker Compose.
PostgreSQL stores auth users through EF Core migrations. Redis stores hashed
FluentA refresh sessions with TTL-backed expiry and explicit revocation on
refresh rotation and logout. Google login uses the authorization-code flow:
the browser redirects to Google with the public client id, and the API exchanges
the code with the server-held client secret before reading the OpenID profile.

## Alternatives Considered

1. Continue using in-memory repositories for local work. Rejected because it
   hides migration and session-state failures.
2. Store refresh sessions in PostgreSQL. Deferred because refresh sessions are
   short-lived, revocable session state and Redis TTLs fit the lifecycle.
3. Exchange Google tokens in the browser. Rejected because it would expose or
   weaken handling of confidential OAuth credentials.

## Consequences

Positive:

- Local development exercises the same persistence shape expected by later
  product stories.
- Refresh rotation remains testable across process boundaries.
- Google client secrets stay server-side.

Tradeoffs:

- Local auth now depends on Docker services.
- Developers must configure Google OAuth credentials before provider login can
  complete against real Google.

## Follow-Up

- Add CI service containers when a CI workflow is introduced.
- Add production secret-provider configuration before deployment.
