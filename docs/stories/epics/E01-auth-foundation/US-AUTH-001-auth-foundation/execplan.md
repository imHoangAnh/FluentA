# Exec Plan

## Goal

Produce the first working FluentA product slice: backend and frontend scaffolds plus email/password authentication, token refresh, logout, `/me`, protected React app shell, and local-development provider stubs.

## Scope

In scope:

- ASP.NET Core/.NET backend scaffold matching the Clean Architecture intent.
- React/Vite frontend scaffold.
- User registration, login, refresh, logout, and `/me`.
- Standard API response envelopes and auth error codes.
- Access token in frontend memory only.
- HttpOnly refresh cookie.
- Local-development Google OAuth and email verification stubs.
- Focused backend/frontend tests and validation commands.
- Harness story, decision, matrix, and trace updates.

Out of scope:

- Vocabulary Board.
- Flashcards and spaced repetition.
- Production Google OAuth provider integration.
- Production email verification delivery.
- AWS, PostgreSQL RDS, Redis ElastiCache, SignalR backplane, or deployment proof.

## Risk Classification

Risk flags:

- Auth.
- Authorization.
- Data model.
- Audit/security.
- External systems.
- Public contracts.
- Weak proof.
- Multi-domain.

Hard gates:

- Auth.
- Authorization.
- Audit/security.
- External provider behavior.

## Work Phases

1. Validate local .NET and frontend scaffold feasibility.
2. Confirm persistence and token-store choice for local proof.
3. Scaffold backend projects and auth contracts.
4. Implement backend auth flows and tests.
5. Scaffold frontend app and auth UI.
6. Implement frontend auth state, refresh, protected route, and tests.
7. Run backend/frontend validation and browser/API smoke checks.
8. Update Harness matrix, trace, and decision records.

## Stop Conditions

Pause for human confirmation if:

- Product behavior conflicts with `history/fluent-auth-foundation/CONTEXT.md`.
- Production provider integration becomes necessary to pass the story.
- Data migration, deletion, or cross-user data leakage risk appears beyond the planned auth model.
- Validation requirements need to be weakened.
- Architecture direction changes away from the approved ASP.NET Core + React stack.
