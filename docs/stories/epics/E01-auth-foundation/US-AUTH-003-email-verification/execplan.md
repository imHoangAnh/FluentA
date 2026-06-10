# Exec Plan

## Goal

Complete SPEC.md password-account email verification behavior.

## Scope

In scope:

- Unverified password-account creation.
- Email-verification token generation and validation.
- Configurable verification email delivery with AWS SES and local deterministic delivery.
- `EMAIL_NOT_VERIFIED` login rejection.
- Local E2E verification flow.
- Product docs and Harness evidence.

Out of scope:

- Resend verification.
- Durable verification-token storage.

## Risk Classification

Risk flags:

- Auth.
- Public contracts.
- External provider behavior.
- Existing behavior.
- Cross-platform browser/API flow.

Hard gates:

- Auth.
- External provider behavior.

## Work Phases

1. Update auth domain and service rules.
2. Add verification token API contract.
3. Add configurable verification email delivery.
4. Update tests and E2E fixtures.
5. Verify backend, frontend, browser suite.
6. Update docs and Harness records.

## Stop Conditions

Pause if live SES proof becomes required without AWS credentials or if verification-token revocation semantics become product-critical.
