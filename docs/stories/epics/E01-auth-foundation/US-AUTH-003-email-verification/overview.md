# Overview

## Current Behavior

Password users were created as already verified, so SPEC.md `EMAIL_NOT_VERIFIED` could never occur.

## Target Behavior

Password registrations create unverified users. Registration sends a verification email through the configured provider. Login is blocked until the email-verification token is posted back. Local development exposes the generated token in the registration response for deterministic tests.

## Affected Users

- Learners registering with email/password.
- Developers running local auth proof.
- Operators configuring AWS SES delivery.

## Affected Product Docs

- `docs/product/authentication.md`
- `docs/stories/spec-coverage-map.md`

## Non-Goals

- HTML email templates.
- Password reset or resend-verification flows.
