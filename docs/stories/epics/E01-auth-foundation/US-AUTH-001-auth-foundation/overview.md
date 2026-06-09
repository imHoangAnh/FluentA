# Overview

## Current Behavior

The repository has Harness docs, an accepted FluentA MVP specification, empty `src/backend` and `src/frontend` directories, and no application implementation. No user can register, log in, refresh, log out, or access a protected app surface.

## Target Behavior

FluentA has a working first implementation slice for Authentication & Account. Users can register and log in with email/password, receive an in-memory access token plus HttpOnly refresh cookie, refresh access, call `/api/v1/auth/me`, log out, and use a React auth UI with `/login`, `/register`, and a protected app shell.

Google OAuth and email verification are implemented only as configuration-ready local-development stubs. Vocabulary Board and Flashcards remain deferred.

## Affected Users

- Self-directed language learner creating or accessing a personal FluentA account.
- Local developer validating the first FluentA auth slice.

## Affected Product Docs

- `SPEC.md`
- `docs/product/authentication.md`

## Non-Goals

- Production Google OAuth provider integration.
- Production email verification delivery.
- Vocabulary Board behavior.
- Flashcard or spaced repetition behavior.
- PostgreSQL/Redis production deployment proof.
