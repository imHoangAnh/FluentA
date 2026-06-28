# 0033 Gmail OTP And Password Reset Auth Boundary

Date: 2026-06-28

## Status

Accepted

## Context

FluentA originally verified password accounts through signed links and a local/SES sender split. Feature 12 replaces that flow with Gmail-delivered OTP verification and adds password recovery, while preserving deterministic local development and the existing refresh-token/session model.

## Decision

FluentA now treats short-lived email challenges as Redis-owned auth state. Password registration issues a six-digit OTP with a 10-minute TTL, a 60-second resend cooldown, and a five-attempt invalidation rule. Password recovery issues a single-use 30-minute reset link. Production delivery uses Gmail SMTP credentials supplied outside tracked files. Local development keeps deterministic test support by returning debug OTP/reset values without logging raw secrets.

## Alternatives Considered

1. Keep signed verification links and add reset links only.
2. Store raw OTP or reset token data on the `auth_users` row.
3. Preserve AWS SES as the default production provider for this feature.

## Consequences

Positive:

- The product now matches the locked Feature 12 OTP and password-recovery contract.
- Short-lived auth challenges stay out of PostgreSQL and can be invalidated atomically in Redis.
- Existing deterministic tests can use local debug OTP/reset data without exposing raw secrets in logs.

Tradeoffs:

- Gmail SMTP and `Authentication:ChallengeKey` must be provisioned outside tracked files for stable non-local behavior.
- Redis challenge behavior adds another auth dependency beyond refresh sessions.

## Follow-Up

- Add live Gmail SMTP and Redis contention proof to the Harness evidence for the dedicated Feature 12 story row.
