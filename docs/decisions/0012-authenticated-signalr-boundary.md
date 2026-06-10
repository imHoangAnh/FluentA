# Authenticated SignalR Boundary

## Status

Accepted

## Context

Browser SignalR clients commonly supply JWT access tokens through the
`access_token` query parameter during WebSocket negotiation. Accepting query
tokens broadly would expand the authentication surface beyond the intended
real-time endpoint.

## Decision

Expose one authorized synchronization hub at `/hubs/sync`. JWT bearer
authentication may read `access_token` from the query string only when the
request path starts with `/hubs/sync`. Synchronization events are sent only
after durable vocabulary/card commits and are scoped to the authenticated user.

## Consequences

- Real-time clients can authenticate with the existing in-memory access token.
- Query-string JWT acceptance remains limited to one explicit endpoint.
- Durable card correctness does not depend on SignalR delivery.
- Multi-instance SignalR backplane behavior remains deferred.
