# E34 Current Story Pack

## Current Story

`US-DEPLOY-001`: Production runtime hardening and release contract.

This is the smallest safe starting point because the current API cannot retain
JWT signing identity across a restart, has localhost-only CORS, emits a
non-secure refresh cookie, and has no dependency-aware readiness endpoint.
Containerization or EC2 automation before these contracts are validated would
automate an unsafe runtime.

## Approval Boundary

Approval of this story authorizes validation and implementation only for:

- configuration-driven production origins and URLs;
- persistent signing-key configuration;
- production cookie and forwarded-header behavior;
- live and ready health endpoints;
- configuration validation and focused tests;
- the associated product/architecture/decision documentation.

It does not authorize:

- provisioning or mutating AWS resources;
- modifying DNS or Vercel;
- creating GitHub secrets/environments/rules;
- deploying to EC2;
- committing or pushing changes;
- changing API business endpoints or database schema.

## Validation Before Implementation

Invoke `harness-validating` and prove:

1. the existing auth tests can be extended without changing the public auth
   response contract;
2. a configured persistent signing key can be loaded safely in .NET 10 and
   invalid configuration fails closed;
3. CORS supports exactly the configured frontend origin with credentials and
   rejects unrelated origins;
4. Secure/SameSite cookie behavior matches the chosen same-site custom-domain
   topology;
5. readiness can check PostgreSQL, Redis, and MinIO without exposing secret
   values or creating destructive state;
6. Caddy forwarded-header trust is restricted rather than accepting arbitrary
   Internet proxy headers;
7. Development behavior remains usable locally.

## Stop Conditions

Stop and return for approval if:

- the frontend and API will not share the same registrable custom domain;
- the signing-key solution requires a hosted key-management service;
- production requires more than one API instance;
- health checks require changing business data or schema;
- authentication response or cookie compatibility must change;
- any tracked credential appears valid or exposed;
- the accepted single-EC2 topology changes.

