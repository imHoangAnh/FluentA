# Design

## Domain Model

Password users start with `IsEmailVerified = false`. Google-created and Google-linked users remain verified.

## Application Flow

This historical story is now superseded by the Feature 12 OTP contract in `docs/product/authentication.md` and `history/auth-email-verification-password-recovery/CONTEXT.md`. Password users still start unverified and login still rejects them with `EMAIL_NOT_VERIFIED`, but verification now happens through Redis-backed OTP challenges rather than signed verification links.

## Interface Contract

- `POST /api/v1/auth/register` returns `{ message, email, verificationExpiresAtUtc, resendAvailableAtUtc, developmentOtp? }`.
- `POST /api/v1/auth/verify-email` accepts `{ email, otp }` and returns `UserProfileDto`.
- Invalid or expired verification OTPs return `401 INVALID_VERIFICATION_OTP`.
- Missing or malformed email/OTP fields return `422 VALIDATION_ERROR`.

## Email Delivery

- `Authentication:Email:Provider=gmail-smtp` sends verification email through
  Gmail SMTP using credentials supplied outside tracked files.
- Non-local email delivery also requires `Authentication:ChallengeKey` outside
  tracked files so OTP challenges survive API restarts.
- `Authentication:Email:Provider=local` is the development/test path. It
  avoids logging raw secrets and returns deterministic debug OTP data for E2E
  tests.

## Data Model

No migration. The existing `auth_users.is_email_verified` column is now enforced for password users.

## UI / Platform Impact

The registration page now routes into OTP verification after account creation.
The login page surfaces the server error when the account has not been verified.

## Observability

Existing request logging covers registration, verification, and failed login attempts. Raw OTPs and reset tokens are not logged.

## Alternatives Considered

1. Add a verification-token table. Deferred because Redis-backed short-lived challenges satisfy the current auth boundary.
2. Require Gmail SMTP for local development. Rejected because E2E tests need deterministic account verification without live mail credentials.
