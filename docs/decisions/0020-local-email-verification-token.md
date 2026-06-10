# 0020 Local Email Verification Token

## Status

Accepted

## Context

SPEC.md requires email verification and `EMAIL_NOT_VERIFIED` login rejection. The local development environment does not include AWS SES, but password-account verification still needs deterministic product proof.

## Decision

Password registrations create unverified users. The API returns a signed, 24-hour email-verification token and URL in the registration response for local development. `POST /api/v1/auth/verify-email` validates the token and marks the user verified.

The token is a JWT signed with the same server signing key infrastructure and includes `token_use=email_verification`, so access tokens cannot be reused for email verification.

Google-created and Google-linked accounts remain verified through provider-owned email verification.

## Consequences

- SPEC login gating is enforced locally without adding SES as a hard dependency.
- Browser and API tests can prove verification deterministically.
- Production email delivery can later send the same verification URL without changing the verification endpoint.
