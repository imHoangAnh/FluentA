# US-DEPLOY-001 Design

## Application Flow

Startup reads and validates:

- allowed frontend origins;
- forwarded-proxy settings;
- public frontend/API/asset URLs;
- persistent JWT signing-key material and key id;
- PostgreSQL, Redis, MinIO, email, OAuth, and optional provider configuration.

Invalid mandatory Production configuration stops startup with a redacted,
actionable error. Development retains documented localhost defaults.

## Interface Contract

Existing business routes and response envelopes remain unchanged.

New operational endpoints:

```text
GET /health/live
GET /health/ready
```

- `live` returns success when the process can serve requests.
- `ready` returns success only when mandatory dependencies are reachable and
  their non-destructive readiness checks pass.
- Failure responses contain dependency categories/status, not endpoints,
  credentials, connection strings, or exception dumps.

## Authentication Contract

- Production refresh cookies are `HttpOnly`, `Secure`, use the approved
  SameSite behavior, and remain host-scoped unless an explicit cross-subdomain
  requirement is approved.
- Only the configured frontend origin receives credentialed CORS access.
- Production signing keys are stable across process restarts and are supplied
  outside tracked configuration.
- Key material is never logged.

## Platform Impact

Caddy terminates TLS and forwards to the API through the private Compose
network. ASP.NET Core trusts forwarded headers only from the known proxy
boundary. Public health checks reach the API through Caddy; dependency details
remain minimal.

## Observability

Log:

- production configuration validation success by category;
- readiness transitions;
- signing key id/fingerprint only, never key material;
- rejected CORS/proxy configuration at safe diagnostic detail.

## Alternatives Considered

1. Generate RSA at startup. Rejected because every deploy invalidates existing
   access tokens and breaks deterministic multi-process behavior.
2. Use a symmetric key pasted into tracked settings. Rejected because tracked
   secrets are unacceptable and key rotation/audit are weaker.
3. Return HTTP 200 from readiness without dependency checks. Rejected because
   deployment automation would promote a container that cannot serve users.
4. Allow any CORS origin with credentials. Rejected because it is unsafe and
   browsers disallow the wildcard-credentials combination.

