# Design

## Domain Model

Auth introduces a `User` aggregate with stable identity, email, full name, password hash, optional Google id, email verification flag, and last-login timestamp.

Business rules:

- Email must be unique.
- Passwords are stored only as hashes.
- OAuth-only users may have no password hash, but production OAuth is deferred.
- Access to authenticated routes is scoped to the current user identity.

Refresh session state is required to revoke logout and reject invalid refresh attempts. The first story may use a local-development store if it preserves the future Redis/PostgreSQL-compatible contract.

## Application Flow

Commands:

- Register user with email, full name, and password.
- Login with email/password.
- Refresh access token from refresh cookie.
- Logout current refresh session.

Queries:

- Get current user profile from authenticated identity.

Local-development stubs:

- Google OAuth exchange endpoint keeps the route/config shape but does not depend on Google provider credentials.
- Email verification is represented by local-development behavior and configuration, not production delivery.

## Interface Contract

Routes:

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/google`

Responses use the standard FluentA envelope from `docs/product/authentication.md`.

Error codes:

- `VALIDATION_ERROR`
- `EMAIL_ALREADY_EXISTS`
- `INVALID_CREDENTIALS`
- `EMAIL_NOT_VERIFIED` only if the local-development verification behavior enforces it.
- `UNAUTHORIZED`
- `INTERNAL_ERROR`

## Data Model

Minimum user fields:

- `Id`
- `Email`
- `FullName`
- `PasswordHash`
- `GoogleId`
- `IsEmailVerified`
- `LastLoginAt`
- `CreatedAt`
- `UpdatedAt`
- `DeletedAt`

Minimum refresh session fields:

- `Id`
- `UserId`
- `TokenHash`
- `ExpiresAt`
- `RevokedAt`
- `CreatedAt`

Future production infrastructure targets PostgreSQL and Redis. This story may use a local-development persistence substitute after validation confirms compile and test viability.

## UI / Platform Impact

Frontend routes:

- `/login`
- `/register`
- authenticated app shell route

Frontend behavior:

- Keep access token in memory only.
- Send refresh cookie with refresh/logout requests.
- Redirect unauthenticated users to `/login`.
- Allow logout from the protected app shell.
- Show meaningful validation and auth errors.

## Observability

The backend should establish request logging structure compatible with the Harness architecture rule: timestamp, level, request id, user id when known, action, duration, status code, and message.

No audit-log product record is required in this first story, but auth-sensitive failures must not log passwords, tokens, or refresh token values.

## Alternatives Considered

1. Build the entire MVP in one pass. Rejected because Vocabulary and Flashcards are separate high-risk domains.
2. Backend-only implementation. Rejected because the approved first slice requires usable React UI proof.
3. Production providers now. Rejected because Google OAuth and email delivery are explicitly local-development stubs for this story.
