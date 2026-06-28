# Authentication

## Product Boundary

Authentication gates all FluentA product surfaces. This contract covers email/password registration, email verification OTP delivery and entry, login, password recovery, refresh, logout, `/me`, Google OAuth code login, and a protected React app shell.

Vocabulary Board, Flashcards, and production deployment wiring outside auth are covered by separate contracts.

## User Outcomes

- A new user can register with email, full name, and password.
- A password user must verify their email before logging in.
- A registering password user receives a six-digit email verification OTP and can request a replacement after a cooldown.
- A registered user can log in with email and password.
- A password-capable account can request a password reset email and choose a new password from a single-use link.
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
- Redis stores FluentA refresh sessions, email verification challenges, and password reset challenges; Google refresh tokens are not stored.

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
| `POST` | `/api/v1/auth/register` | Creates an unverified email/password user, issues the first verification OTP, and returns deterministic local debug data only in the local provider path. |
| `POST` | `/api/v1/auth/verify-email` | Verifies a password user from email plus six-digit OTP. |
| `POST` | `/api/v1/auth/resend-verification-otp` | Replaces the current OTP after the cooldown window and invalidates the previous code. |
| `POST` | `/api/v1/auth/login` | Verifies credentials and returns an access token plus refresh cookie. |
| `POST` | `/api/v1/auth/forgot-password` | Sends a single-use password reset link for a password-capable account and explicitly warns when the email is unknown. |
| `POST` | `/api/v1/auth/reset-password` | Consumes a single-use reset token, stores the new password hash, and returns the user to Login. |
| `POST` | `/api/v1/auth/refresh` | Uses the refresh cookie to issue a new access token. |
| `POST` | `/api/v1/auth/logout` | Revokes the refresh token and clears the cookie. |
| `GET` | `/api/v1/auth/me` | Returns the current authenticated user profile. |
| `POST` | `/api/v1/auth/google` | Exchanges a Google authorization code, creates or links the user, and returns an access token plus refresh cookie. |

## Validation And Error Rules

- Registration validates email format, unique email, full name length, and password length.
- Login returns `401 INVALID_CREDENTIALS` for invalid email or password without revealing which field failed.
- Login returns `403 EMAIL_NOT_VERIFIED` for unverified password accounts.
- Invalid or expired verification OTPs return `401 INVALID_VERIFICATION_OTP`.
- Resending inside the cooldown window returns `429 VERIFICATION_OTP_COOLDOWN`.
- Resending for an already verified account returns `409 EMAIL_ALREADY_VERIFIED`.
- OAuth-only accounts return `409 PASSWORD_RESET_NOT_AVAILABLE` for password recovery.
- Invalid or expired password reset links return `401 INVALID_PASSWORD_RESET_TOKEN`.
- Invalid or expired access tokens return `401 UNAUTHORIZED`.
- Missing or invalid refresh cookies return `401 UNAUTHORIZED`.
- Validation errors return `422 VALIDATION_ERROR` with field-level details.
- Duplicate email returns `409 EMAIL_ALREADY_EXISTS`.
- Missing Google OAuth credentials return `501 GOOGLE_OAUTH_NOT_CONFIGURED`.
- Invalid Google authorization codes or profile responses return `401 GOOGLE_OAUTH_FAILED`.
- A Google subject conflict on an existing email returns `409 GOOGLE_ACCOUNT_CONFLICT`.

## Email Challenge Delivery

- Registration sends a six-digit verification OTP through `IAccountEmailSender`.
- Verification OTPs expire after 10 minutes.
- Users must wait 60 seconds before requesting a replacement OTP, and replacement invalidates the previous code.
- Five incorrect OTP submissions invalidate the verification challenge.
- Password reset links expire after 30 minutes and are single-use.
- Production email delivery uses Gmail SMTP when `Authentication:Email:Provider=gmail-smtp`.
- Gmail SMTP delivery requires `Authentication:Email:FromAddress` plus `Authentication:Email:Smtp:Username` and `Authentication:Email:Smtp:Password`, supplied outside tracked files.
- Non-local email delivery also requires `Authentication:ChallengeKey`, supplied outside tracked files, so OTP and reset challenges survive API restarts for their intended lifetime.
- Local development uses `Authentication:Email:Provider=local`, does not log raw OTPs or reset tokens, and returns deterministic debug OTP/reset data only for local test flows.
- Production-like local browser testing uses `http://127.0.0.1:5173` consistently for the frontend URL, callback URL, and email base URL so refresh-cookie behavior matches deployment expectations more closely.

## Google OAuth Rules

- The frontend redirects to Google's authorization endpoint with `openid email profile`.
- The API exchanges the authorization code with the server-held Google client secret.
- The frontend must never receive or store the Google client secret.
- The callback route is `/auth/google/callback`.
- If `VITE_GOOGLE_CLIENT_ID` is not configured, the Google button does not redirect.
- The tracked development config must not contain a live Google client secret.

## Acceptance Criteria

- Email/password registration succeeds for valid input.
- Email/password registration creates an unverified user and sends a verification OTP through the configured provider.
- Local email delivery emits deterministic debug OTP/reset data for development and tests without logging raw secrets.
- Email verification marks the user verified.
- Resend replaces the previous OTP only after the cooldown window.
- Unverified password users cannot log in and receive `EMAIL_NOT_VERIFIED`.
- Duplicate email returns a conflict response.
- Forgot Password explicitly warns when the email does not exist.
- Password reset is unavailable for Google-only accounts.
- Password reset links are single-use and allow login with the new password without revoking other sessions.
- Email/password login returns an access token and sets an HttpOnly refresh cookie.
- `/me` returns the logged-in user with a valid access token.
- Refresh returns a new access token while the refresh cookie is valid.
- Logout revokes the refresh token, clears the cookie, and the protected UI no longer shows authenticated content.
- Refresh after rotation rejects the previous refresh token.
- Refresh after logout rejects the logged-out refresh token.
- Local Postgres migration creates the auth user table.
- Redis stores and revokes refresh sessions.
- Google OAuth is covered by deterministic tests and returns configuration/provider errors through the auth envelope.
- The React UI supports login, registration, email verification OTP entry, forgot password, reset password, protected routing, token refresh, and logout.
- Access token is not persisted in browser storage.
