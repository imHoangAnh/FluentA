# Authentication

## Product Boundary

Authentication gates all FluentA product surfaces. This contract covers email/password registration, login, refresh, logout, `/me`, Google OAuth code login, local-development email verification behavior, and a protected React app shell.

Vocabulary Board, Flashcards, production deployment wiring, and production email delivery are outside this contract until separate stories accept them.

## User Outcomes

- A new user can register with email, full name, and password.
- A registered user can log in with email and password.
- A logged-in user can view their current profile through `/api/v1/auth/me`.
- A logged-in user can refresh access without re-entering credentials while the refresh cookie is valid.
- A logged-in user can log out and lose access to protected routes.
- A user can continue with Google when local Google credentials are configured.
- The React app exposes `/login`, `/register`, and a protected authenticated app shell.

## Token Rules

- Access tokens are JWTs and are held in frontend memory only.
- Access tokens must not be stored in `localStorage` or `sessionStorage`.
- Refresh tokens are stored in an HttpOnly cookie.
- Refresh sessions are stored server-side by hashed token in Redis with a seven-day expiry.
- Refresh rotation revokes the previous refresh token before issuing the replacement.
- Logout revokes the refresh token server-side and clears the cookie.

## Persistence Rules

- Local development runs PostgreSQL and Redis through `docker-compose.dev.yml`.
- PostgreSQL stores auth users in `auth_users` through EF Core migrations.
- Email is normalized and unique.
- Google subject ids are optional and unique when present.
- Redis stores FluentA refresh sessions only; Google refresh tokens are not stored.

## API Contract

All responses use the FluentA envelope:

```json
{
  "success": true,
  "data": {}
}
```

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "One or more validation errors occurred.",
    "details": {}
  }
}
```

### Endpoints In Scope

| Method | Endpoint | Behavior |
| --- | --- | --- |
| `POST` | `/api/v1/auth/register` | Creates an email/password user and returns a registration message. |
| `POST` | `/api/v1/auth/login` | Verifies credentials and returns an access token plus refresh cookie. |
| `POST` | `/api/v1/auth/refresh` | Uses the refresh cookie to issue a new access token. |
| `POST` | `/api/v1/auth/logout` | Revokes the refresh token and clears the cookie. |
| `GET` | `/api/v1/auth/me` | Returns the current authenticated user profile. |
| `POST` | `/api/v1/auth/google` | Exchanges a Google authorization code, creates or links the user, and returns an access token plus refresh cookie. |

## Validation And Error Rules

- Registration validates email format, unique email, full name length, and password length.
- Login returns `401 INVALID_CREDENTIALS` for invalid email or password without revealing which field failed.
- Invalid or expired access tokens return `401 UNAUTHORIZED`.
- Missing or invalid refresh cookies return `401 UNAUTHORIZED`.
- Validation errors return `422 VALIDATION_ERROR` with field-level details.
- Duplicate email returns `409 EMAIL_ALREADY_EXISTS`.
- Missing Google OAuth credentials return `501 GOOGLE_OAUTH_NOT_CONFIGURED`.
- Invalid Google authorization codes or profile responses return `401 GOOGLE_OAUTH_FAILED`.
- A Google subject conflict on an existing email returns `409 GOOGLE_ACCOUNT_CONFLICT`.

## Google OAuth Rules

- The frontend redirects to Google's authorization endpoint with `openid email profile`.
- The API exchanges the authorization code with the server-held Google client secret.
- The frontend must never receive or store the Google client secret.
- The callback route is `/auth/google/callback`.
- If `VITE_GOOGLE_CLIENT_ID` is not configured, the Google button does not redirect.

## Acceptance Criteria

- Email/password registration succeeds for valid input.
- Duplicate email returns a conflict response.
- Email/password login returns an access token and sets an HttpOnly refresh cookie.
- `/me` returns the logged-in user with a valid access token.
- Refresh returns a new access token while the refresh cookie is valid.
- Logout revokes the refresh token, clears the cookie, and the protected UI no longer shows authenticated content.
- Refresh after rotation rejects the previous refresh token.
- Refresh after logout rejects the logged-out refresh token.
- Local Postgres migration creates the auth user table.
- Redis stores and revokes refresh sessions.
- Google OAuth is covered by deterministic tests and returns configuration/provider errors through the auth envelope.
- The React UI supports login, registration, protected routing, token refresh, and logout.
- Access token is not persisted in browser storage.
