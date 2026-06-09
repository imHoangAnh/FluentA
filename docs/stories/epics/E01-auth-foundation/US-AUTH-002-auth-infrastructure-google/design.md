# Design

## Domain Model

`User` remains the auth aggregate. It supports password-backed creation,
Google-backed creation, and linking an existing email-matched account to a
Google subject id. Email stays normalized and unique.

## Application Flow

Registration and password login keep the existing application service contract.
Refresh now uses Redis-backed session lookups while preserving rotation:
after a successful refresh, the previous refresh token must no longer work.

Google login receives an authorization `code`, exchanges it on the server with
Google OAuth credentials, reads the OpenID user profile, then creates or links a
local user before issuing FluentA tokens.

## Interface Contract

Existing routes remain:

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/google`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`

`POST /api/v1/auth/google` now accepts `{ "code": "...", "redirectUri": "..." }`.
If Google credentials are not configured, it returns `GOOGLE_OAUTH_NOT_CONFIGURED`.
If Google rejects the code or profile, it returns `GOOGLE_OAUTH_FAILED`.

## Data Model

PostgreSQL stores `auth_users` with a unique email index and optional unique
Google subject index. EF Core owns migrations under
`src/backend/FluentA.Infrastructure/Persistence/Migrations`.

Redis stores refresh sessions by token hash with a seven-day TTL. Revocation
deletes or invalidates the hashed session so the raw refresh token cannot be
used again.

## UI / Platform Impact

The frontend Google button redirects to Google's authorization endpoint when
`VITE_GOOGLE_CLIENT_ID` is configured. The callback route sends the returned
authorization code to the API and then enters the protected workspace.

## Observability

Existing request log middleware remains the operational proof surface for API
requests. Docker Compose service names and local ports are documented for local
developer diagnosis.

## Alternatives Considered

1. Keep in-memory auth behind a feature flag. Rejected for local development
   because it would not prove migration or Redis behavior.
2. Store refresh sessions in PostgreSQL. Deferred because Redis better matches
   short-lived session state and supports TTL cleanup without schema churn.
