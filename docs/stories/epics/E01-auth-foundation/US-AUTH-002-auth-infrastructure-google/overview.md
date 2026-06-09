# Overview

## Current Behavior

FluentA has a working local auth shell backed by in-memory users and in-memory
refresh sessions. Google login returns a local-development stub error.

## Target Behavior

Local development runs PostgreSQL and Redis through Docker. Registered and
Google-created users persist in PostgreSQL through EF Core migrations. Refresh
sessions are issued, looked up, rotated, and revoked in Redis. Google login
exchanges an authorization code on the API server and creates or links the
FluentA user before issuing the normal FluentA access and refresh tokens.

## Affected Users

- Learners signing up or logging in locally.
- Developers running the app with local infrastructure.

## Affected Product Docs

- `docs/product/authentication.md`

## Non-Goals

- Production deployment configuration.
- Google refresh-token storage for calling Google APIs after login.
- Email verification delivery.
