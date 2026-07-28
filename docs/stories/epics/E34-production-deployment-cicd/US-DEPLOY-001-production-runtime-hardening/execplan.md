# US-DEPLOY-001 Exec Plan

## Goal

Make the existing FluentA API safe and observable enough to become the input
to production containerization without changing business API or schema
contracts.

## Scope

In scope:

- production options and validation;
- persistent JWT signing-key loading;
- CORS, cookie, forwarded-header configuration;
- live and ready health endpoints;
- focused unit/integration tests;
- production deployment product and decision documentation for this boundary.

Out of scope:

- Dockerfiles and Compose;
- EC2, Vercel, DNS, GitHub, IAM, or SSM changes;
- deployment execution;
- database schema changes.

## Risk Classification

Risk flags:

- authentication and session compatibility;
- secret handling;
- production proxy/security boundary;
- dependency readiness and release automation.

Hard gates:

- no valid secret may be committed or printed;
- auth response contracts remain unchanged;
- Development remains runnable;
- production fails closed for missing signing key/origin configuration;
- negative health tests prove unavailable dependencies return not-ready.

## Work Phases

1. Validate the approved configuration and signing-key approach.
2. Add typed production options and safe validation.
3. Replace startup-generated production signing identity.
4. Configure exact CORS, secure cookie, and trusted forwarded headers.
5. Add live and ready health endpoints.
6. Add focused auth, configuration, and health tests.
7. Update product/architecture/decision documentation.
8. Run backend solution tests, API build, negative readiness smoke, and
   configuration secret scan.
9. Record Harness evidence without claiming EC2 readiness.

## Stop Conditions

Pause for human confirmation if:

- auth or cookie compatibility must change;
- a hosted signing service becomes required;
- readiness requires schema writes;
- tracked production secrets are discovered;
- the custom-domain topology changes;
- validation would require weakening existing tests.

