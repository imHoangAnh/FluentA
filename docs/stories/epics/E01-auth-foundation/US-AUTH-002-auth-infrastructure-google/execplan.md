# Exec Plan

## Goal

Make local auth durable and provider-ready by adding Docker-managed
PostgreSQL, EF Core migrations, Redis refresh sessions, and Google OAuth code
login.

## Scope

In scope:

- Docker Compose for PostgreSQL and Redis local services.
- EF Core user persistence and initial migration.
- Redis-backed refresh token store with rotation and logout revocation.
- Google OAuth code exchange and OpenID user profile lookup.
- Frontend Google redirect and callback route.
- Product docs, decision record, Harness matrix, and validation evidence.

Out of scope:

- Production secrets management.
- CI service containers.
- Google API access beyond login identity.

## Risk Classification

Risk flags:

- Auth.
- Data model.
- Audit/security.
- External systems.
- Public contracts.
- Existing behavior.
- Weak proof.

Hard gates:

- Auth.
- Data migration.
- External provider behavior.

## Work Phases

1. Record Harness intake and story packet.
2. Add local infrastructure and persistence packages.
3. Implement EF Core repository and initial migration.
4. Implement Redis refresh store.
5. Implement Google OAuth exchange and frontend callback.
6. Verify unit, integration, frontend build/lint, API smoke, and Docker stack.
7. Update Harness matrix, decision log, and trace.

## Stop Conditions

Pause for human confirmation if:

- Existing user data would need a destructive migration.
- Google auth requires storing Google refresh tokens.
- Docker cannot run locally and an alternate infrastructure path is needed.
