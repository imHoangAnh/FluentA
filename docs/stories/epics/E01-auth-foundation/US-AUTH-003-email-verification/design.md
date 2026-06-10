# Design

## Domain Model

Password users start with `IsEmailVerified = false`. Google-created and Google-linked users remain verified.

## Application Flow

Registration creates a signed email-verification token, stores the unverified user, and sends a verification email through `IEmailVerificationSender`. `POST /api/v1/auth/verify-email` validates the token, loads the user, marks the account verified, and returns the verified profile. Login rejects unverified password users with `EMAIL_NOT_VERIFIED`.

## Interface Contract

- `POST /api/v1/auth/register` returns `{ message, emailVerificationToken, emailVerificationUrl }`.
- `POST /api/v1/auth/verify-email` accepts `{ token }` and returns `UserProfileDto`.
- Invalid or expired verification tokens return `401 INVALID_VERIFICATION_TOKEN`.
- Missing token returns `422 VALIDATION_ERROR`.

## Email Delivery

- `Authentication:Email:Provider=ses` sends verification email through AWS SES
  using `AWSSDK.SimpleEmailV2`.
- SES mode requires `Authentication:Email:FromAddress`; `FromName`, `Region`,
  and `VerificationBaseUrl` are configurable.
- AWS credentials come from the AWS SDK default credential chain.
- `Authentication:Email:Provider=local` is the development/test path. It logs a
  delivery-accepted message without logging the token and keeps the response
  token/link deterministic for E2E tests.

## Data Model

No migration. The existing `auth_users.is_email_verified` column is now enforced for password users.

## UI / Platform Impact

The registration page still redirects to login after account creation. The login page surfaces the server error when the account has not been verified.

## Observability

Existing request logging covers registration, verification, and failed login attempts. Tokens are not logged.

## Alternatives Considered

1. Add a verification-token table. Deferred because signed short-lived JWTs are sufficient for MVP local proof.
2. Require SES for local development. Rejected because E2E tests need deterministic account verification without cloud credentials.
